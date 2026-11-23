/**
 * 标签图 / PDF 识别 → 可编辑组件（纯函数，供单测与浏览器共用）。
 */
const FONT = 'Microsoft YaHei'

let _idSeq = 0
export function resetLabelImportIds(seed = 0) {
  _idSeq = seed
}
function nextId(prefix = 'imp') {
  _idSeq += 1
  return `${prefix}_${_idSeq}`
}

/** @typedef {{ text: string, x: number, y: number, w?: number, h?: number, fontSize?: number }} OcrLine */

const BARCODE_RE = /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/

export function looksLikeBarcode(text) {
  const s = String(text || '').replace(/\s/g, '')
  if (!BARCODE_RE.test(s)) return false
  return s.length >= 8
}

/**
 * 按行聚类 OCR 文本块（输入坐标可为 px 或 mm，一致即可）。
 */
export function groupOcrLines(items, lineThreshold = 0.35) {
  const list = (items || [])
    .map((it) => ({
      text: String(it.text || '').trim(),
      x: Number(it.x) || 0,
      y: Number(it.y) || 0,
      w: Number(it.w) || 0,
      h: Number(it.h) || Math.max(1, Number(it.fontSize) || 10) * 0.35,
      fontSize: Number(it.fontSize) || 10
    }))
    .filter((it) => it.text)
  if (!list.length) return []
  list.sort((a, b) => (a.y - b.y) || (a.x - b.x))
  const avgH = list.reduce((s, it) => s + it.h, 0) / list.length
  const thr = avgH * lineThreshold
  const rows = []
  for (const it of list) {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= thr)
    if (row) {
      row.parts.push(it)
      row.y = (row.y * (row.parts.length - 1) + it.y) / row.parts.length
    } else {
      rows.push({ y: it.y, parts: [it] })
    }
  }
  for (const row of rows) {
    row.parts.sort((a, b) => a.x - b.x)
    row.text = row.parts.map((p) => p.text).join(' ')
    row.x = row.parts[0].x
    row.w = row.parts.reduce((s, p) => s + p.w, 0) + (row.parts.length - 1) * 2
    row.h = Math.max(...row.parts.map((p) => p.h))
    row.fontSize = Math.round(row.parts.reduce((s, p) => s + p.fontSize, 0) / row.parts.length)
  }
  return rows
}

/**
 * @param {OcrLine[]} grouped
 * @param {{ width: number, height: number }} labelMm
 * @param {{ scalePxPerMm?: number }} opts
 */
export function layoutLinesToComponents(grouped, labelMm, opts = {}) {
  const lw = Math.max(10, Number(labelMm?.width) || 60)
  const lh = Math.max(10, Number(labelMm?.height) || 40)
  const scale = Number(opts.scalePxPerMm) || 1
  const toMm = (v) => v / scale

  const lines = Array.isArray(grouped) ? grouped : []
  if (!lines.length) {
    return {
      paper: { width: lw, height: lh, backgroundColor: '#ffffff' },
      label: { width: lw, height: lh, backgroundColor: '#ffffff', showBorder: false, borderColor: '#000', borderWidth: 0.3 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      layout: { mode: 'single', sizingMode: 'manual', cols: 1, rows: 1, hGap: 2, vGap: 2 },
      components: []
    }
  }

  const minX = Math.min(...lines.map((l) => l.x))
  const minY = Math.min(...lines.map((l) => l.y))
  const maxX = Math.max(...lines.map((l) => l.x + l.w))
  const maxY = Math.max(...lines.map((l) => l.y + l.h))
  const srcW = Math.max(1, maxX - minX)
  const srcH = Math.max(1, maxY - minY)
  const fit = Math.min((lw - 4) / toMm(srcW), (lh - 4) / toMm(srcH), 1.2)

  const components = []
  for (const line of lines) {
    const text = line.text
    const left = 2 + toMm(line.x - minX) * fit
    const top = 2 + toMm(line.y - minY) * fit
    const width = Math.min(lw - left - 2, Math.max(8, toMm(line.w) * fit))
    const height = Math.max(4, toMm(line.h) * fit * 1.1)
    const fontSize = Math.max(6, Math.min(18, (line.fontSize || 10) * fit * 0.28))

    if (looksLikeBarcode(text)) {
      components.push({
        id: nextId(),
        type: 'barcode',
        name: '条码',
        left,
        top,
        width,
        height: Math.max(8, height),
        angle: 0,
        text: '',
        binding: '',
        format: text.length === 13 ? 'EAN13' : 'CODE128',
        dataMode: 'fixed',
        displayValue: true
      })
      components.push({
        id: nextId(),
        type: 'text',
        name: '条码号',
        left,
        top: top + Math.max(8, height) + 0.5,
        width,
        height: 4,
        angle: 0,
        text,
        fontSize: 7,
        fill: '#334155',
        fontFamily: FONT,
        fontWeight: 'normal',
        textAlign: 'center',
        binding: '',
        dataMode: 'fixed'
      })
      continue
    }

    if (/^https?:\/\//i.test(text) || text.length > 24) {
      const side = Math.min(22, lw * 0.45, lh * 0.45)
      components.push({
        id: nextId(),
        type: 'qrcode',
        name: '二维码',
        left: Math.min(left, lw - side - 2),
        top,
        width: side,
        height: side,
        angle: 0,
        text,
        binding: '',
        format: 'QR',
        dataMode: 'fixed'
      })
      continue
    }

    components.push({
      id: nextId(),
      type: 'text',
      name: text.slice(0, 8) || '文本',
      left,
      top,
      width,
      height,
      angle: 0,
      text,
      fontSize,
      fill: '#0f172a',
      fontFamily: FONT,
      fontWeight: fontSize >= 11 ? 'bold' : 'normal',
      textAlign: 'left',
      binding: '',
      dataMode: 'fixed'
    })
  }

  return {
    paper: { width: lw, height: lh, backgroundColor: '#ffffff' },
    label: { width: lw, height: lh, backgroundColor: '#ffffff', showBorder: false, borderColor: '#94a3b8', borderWidth: 0.3 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    layout: { mode: 'single', sizingMode: 'manual', cols: 1, rows: 1, hGap: 2, vGap: 2 },
    components
  }
}

/**
 * pdf.js getTextContent items → OcrLine[]
 * @param {Array<{ str: string, transform: number[] }>} items
 * @param {number} pageHeightPt viewport scale → user space
 */
export function pdfTextItemsToOcrLines(items, pageHeight, viewportScale = 1) {
  const sc = viewportScale || 1
  const out = []
  for (const it of items || []) {
    const str = String(it.str || '').trim()
    if (!str) continue
    const tr = it.transform || [1, 0, 0, 1, 0, 0]
    const x = (tr[4] || 0) / sc
    const y = pageHeight - (tr[5] || 0) / sc
    const fs = Math.abs(tr[0] || tr[3] || 10) / sc
    out.push({
      text: str,
      x,
      y: y - fs,
      w: str.length * fs * 0.55,
      h: fs * 1.1,
      fontSize: fs
    })
  }
  return out
}

export function mergeImportLayout(baseLayout, imageComponent) {
  const comps = [...(baseLayout?.components || [])]
  if (imageComponent) comps.unshift(imageComponent)
  return { ...baseLayout, components: comps }
}