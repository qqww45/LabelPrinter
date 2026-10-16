/**
 * 热敏机指令。下载成文本，由用户自己发给打印机，不经过服务器。
 * 中文原样写 UTF-8，能不能打出来取决于打印机字库。
 * job.calibrate：本机偏移/缩放（见 thermalCalibrate.js）。
 */
import { renderText } from './render.js'
import { componentHidden, componentPlainText } from './printModel.js'
import { calibrationPieces, normalizeCalibrate, transformPiece } from './thermalCalibrate.js'
import { clampGapMm } from './thermalMedia.js'

function dpiOf(job) {
  return Number(job?.dpi) === 300 ? 300 : 203
}

/** 坐标可负（校准左/上偏）；尺寸不小于 0 */
function dotsPos(mm, dpi) {
  return Math.round((Number(mm) || 0) * dpi / 25.4)
}

function dotsSize(mm, dpi) {
  return Math.max(0, Math.round((Number(mm) || 0) * dpi / 25.4))
}

function num(n) {
  const x = Number(n) || 0
  const r = Math.round(x * 10) / 10
  return Number.isInteger(r) ? String(r) : String(r)
}

function hasCjk(s) {
  return /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/.test(s)
}

function tsplString(s) {
  return String(s ?? '').replace(/[\r\n]/g, ' ').replace(/"/g, "'")
}

function zplString(s) {
  return String(s ?? '').replace(/[\r\n^~\\]/g, ' ')
}

function tableBits(c, row) {
  const rows = Math.max(0, c.rows || 0)
  const cols = Math.max(0, c.cols || 0)
  if (!rows || !cols) return []
  const rh = (Number(c.height) || 0) / rows
  const cw = (Number(c.width) || 0) / cols
  const out = []
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const cell = c.cells?.[`${r},${col}`]
      if (!cell || (cell.type && cell.type !== 'text')) continue
      let text = ''
      if (cell.text && String(cell.text).includes('{{')) text = renderText(cell.text, row)
      else if (cell.binding) {
        const v = row?.[cell.binding]
        text = v != null && v !== '' ? String(v) : (cell.text || '')
      } else text = cell.text || ''
      text = String(text ?? '').trim()
      if (!text) continue
      out.push({
        text,
        x: (Number(c.left) || 0) + col * cw,
        y: (Number(c.top) || 0) + r * rh,
        fontSize: c.fontSize || 12
      })
    }
  }
  return out
}

function pieces(components, row) {
  const out = []
  for (const c of components || []) {
    if (!c || componentHidden(c, row)) continue
    if (c.type === 'table') {
      for (const bit of tableBits(c, row)) out.push({ kind: 'text', ...bit })
      continue
    }
    if (c.type === 'text' || c.type === 'date' || c.type === 'serial' || c.type === 'checkbox') {
      const text = String(componentPlainText(c, row) ?? '').trim()
      if (!text) continue
      out.push({
        kind: 'text',
        text,
        x: Number(c.left) || 0,
        y: Number(c.top) || 0,
        fontSize: c.fontSize || 14
      })
      continue
    }
    if (c.type === 'qrcode' || c.type === 'barcode') {
      const text = String(componentPlainText(c, row) ?? '').trim()
      if (!text) continue
      out.push({
        kind: c.type,
        text,
        format: c.format || 'CODE128',
        x: Number(c.left) || 0,
        y: Number(c.top) || 0,
        w: Number(c.width) || 20,
        h: Number(c.height) || 20
      })
      continue
    }
    if (c.type === 'rect' || c.type === 'ellipse') {
      // 热敏指令无椭圆原语时用 BOX 近似外接矩形，位置尺寸仍与画布一致
      out.push({
        kind: 'rect',
        x: Number(c.left) || 0,
        y: Number(c.top) || 0,
        w: Number(c.width) || 10,
        h: Number(c.height) || 10,
        strokeWidth: c.strokeWidth || 1
      })
      continue
    }
    if (c.type === 'line') {
      out.push({
        kind: 'line',
        x: Number(c.left) || 0,
        y: Number(c.top) || 0,
        w: Number(c.width) || 10,
        h: Math.max(0.2, (Number(c.strokeWidth) || 1) * 25.4 / 96)
      })
    }
  }
  return out
}

function labelsOf(job) {
  const list = Array.isArray(job?.labels) ? job.labels : []
  return list.length ? list : [{ row: {} }]
}

function jobPieces(job, row) {
  const cal = normalizeCalibrate(job.calibrate)
  const raw = job.calibrationOnly
    ? calibrationPieces(job.label || {})
    : pieces(job.components, row || {})
  return raw.map((p) => transformPiece(p, cal))
}

export function buildTSPL(job = {}) {
  const dpi = dpiOf(job)
  const label = job.label || {}
  const w = label.width || 40
  const h = label.height || 30
  const gap = clampGapMm(job.gapMm, 2)
  const media = job.media || 'gap'
  const dir = job.direction ? 1 : 0
  const lines = [
    `SIZE ${num(w)} mm,${num(h)} mm`,
    media === 'mark'
      ? `BLINE ${num(gap)} mm,0 mm`
      : `GAP ${media === 'continuous' ? 0 : num(gap)} mm,0 mm`,
    `DIRECTION ${dir}`,
    'CODEPAGE UTF-8',
    'CLS'
  ]
  labelsOf(job).forEach((item, i) => {
    if (i) lines.push('CLS')
    for (const p of jobPieces(job, item.row || {})) {
      const x = dotsPos(p.x, dpi)
      const y = dotsPos(p.y, dpi)
      if (p.kind === 'text') {
        const mul = Math.max(1, Math.min(10, Math.round((p.fontSize || 14) * dpi / 96 / 24)))
        const font = hasCjk(p.text) ? 'TSS24.BF2' : '0'
        lines.push(`TEXT ${x},${y},"${font}",0,${mul},${mul},"${tsplString(p.text)}"`)
      } else if (p.kind === 'barcode') {
        const bh = Math.max(16, dotsSize(p.h, dpi))
        lines.push(`BARCODE ${x},${y},"128",${bh},1,0,2,4,"${tsplString(p.text)}"`)
      } else if (p.kind === 'qrcode') {
        const cell = Math.max(2, Math.round(dotsSize(Math.min(p.w, p.h), dpi) / 29))
        lines.push(`QRCODE ${x},${y},M,${cell},A,0,"${tsplString(p.text)}"`)
      } else if (p.kind === 'rect') {
        const x2 = dotsPos(p.x + p.w, dpi)
        const y2 = dotsPos(p.y + p.h, dpi)
        const t = Math.max(1, dotsSize((p.strokeWidth || 1) * 25.4 / 96, dpi))
        lines.push(`BOX ${x},${y},${x2},${y2},${t}`)
      } else if (p.kind === 'line') {
        lines.push(`BAR ${x},${y},${Math.max(1, dotsSize(p.w, dpi))},${Math.max(1, dotsSize(p.h, dpi))}`)
      }
    }
    lines.push('PRINT 1,1')
  })
  return lines.join('\r\n') + '\r\n'
}

export function buildZPL(job = {}) {
  const dpi = dpiOf(job)
  const label = job.label || {}
  const pw = dotsSize(label.width || 40, dpi)
  const ll = dotsSize(label.height || 30, dpi)
  const media = job.media === 'mark' ? 'M' : job.media === 'continuous' ? 'N' : 'Y'
  const dir = job.direction ? 'N' : 'I'
  const blocks = []
  for (const item of labelsOf(job)) {
    const lines = [
      '^XA',
      '^CI28',
      `^PW${pw}`,
      `^LL${ll}`,
      `^MN${media}`,
      `^PO${dir}`,
      '^LH0,0'
    ]
    for (const p of jobPieces(job, item.row || {})) {
      const x = dotsPos(p.x, dpi)
      const y = dotsPos(p.y, dpi)
      if (p.kind === 'text') {
        const th = Math.max(10, Math.round((p.fontSize || 14) * dpi / 96))
        lines.push(`^FO${x},${y}^A0N,${th},${th}^FD${zplString(p.text)}^FS`)
      } else if (p.kind === 'barcode') {
        const bh = Math.max(16, dotsSize(p.h, dpi))
        lines.push(`^FO${x},${y}^BCN,${bh},Y,N,N^FD${zplString(p.text)}^FS`)
      } else if (p.kind === 'qrcode') {
        const cell = Math.max(2, Math.round(dotsSize(Math.min(p.w, p.h), dpi) / 29))
        lines.push(`^FO${x},${y}^BQN,2,${cell}^FDMA,${zplString(p.text)}^FS`)
      } else if (p.kind === 'rect') {
        const bw = Math.max(1, dotsSize(p.w, dpi))
        const bh = Math.max(1, dotsSize(p.h, dpi))
        const t = Math.max(1, dotsSize((p.strokeWidth || 1) * 25.4 / 96, dpi))
        lines.push(`^FO${x},${y}^GB${bw},${bh},${t}^FS`)
      } else if (p.kind === 'line') {
        lines.push(`^FO${x},${y}^GB${Math.max(1, dotsSize(p.w, dpi))},${Math.max(1, dotsSize(p.h, dpi))},${Math.max(1, dotsSize(p.h, dpi))}^FS`)
      }
    }
    lines.push('^XZ')
    blocks.push(lines.join('\n'))
  }
  return blocks.join('\n') + '\n'
}
