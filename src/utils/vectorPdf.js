/**
 * 矢量 PDF。矩形、线、二维码模块、条码黑条直接写进 PDF，放大不失真。
 * 拉丁文字用 Helvetica。中文走 300dpi 小图：浏览器嵌不进系统里的微软雅黑。
 */
import { jsPDF } from 'jspdf'
import JsBarcode from 'jsbarcode'
import { renderText } from './render.js'
import { componentHidden, componentPlainText, paginateLabels, slotOffsetMm } from './printModel.js'
import { qrMatrix } from './codeGeom.js'
import { barcodeToCanvas, canvasToDataURL, qrToCanvas } from './cellImage.js'
import { barcodePrintPx } from './barcodeFit.js'
import { safeImageSrc } from './escapeHtml.js'
import { sizeOffsets, tableColumnWidths, tableRowHeights } from './tableGeom.js'

export { tableColumnWidths, tableRowHeights }

const PX_TO_MM = 25.4 / 96

function pxMm(px) {
  return (Number(px) || 0) * PX_TO_MM
}

export function rgb(hex) {
  const s = String(hex || '#000000').trim()
  let m = s.match(/^#([0-9a-f]{6})$/i)
  if (m) {
    const n = parseInt(m[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  m = s.match(/^#([0-9a-f]{3})$/i)
  if (m) {
    return m[1].split('').map(ch => parseInt(ch + ch, 16))
  }
  m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return [0, 0, 0]
}

/** 含中文、¥ 等 Helvetica 写不了的字符时，整段改用描边小图，避免符号被编成乱码。 */
export function textNeedsOutlineFont(text) {
  return [...String(text || '')].some(ch => ch.codePointAt(0) > 127)
}

function setFill(pdf, hex) {
  const [r, g, b] = rgb(hex)
  pdf.setFillColor(r, g, b)
}

function setStroke(pdf, hex) {
  const [r, g, b] = rgb(hex)
  pdf.setDrawColor(r, g, b)
}

/** jsPDF 的 text() 读的是文字色，不是填充色；价格等拉丁字必须走这里。 */
function setText(pdf, hex) {
  const [r, g, b] = rgb(hex)
  pdf.setTextColor(r, g, b)
}

function tableCellText(c, r, col, row) {
  const cell = c.cells?.[`${r},${col}`]
  if (!cell) return ''
  if (cell.text && String(cell.text).includes('{{')) return renderText(cell.text, row)
  if (cell.binding) {
    const v = row?.[cell.binding]
    return v != null && v !== '' ? String(v) : (cell.text || '')
  }
  return cell.text || ''
}

function drawQr(pdf, text, x, y, w, h) {
  const matrix = qrMatrix(text)
  const n = matrix.length
  if (!n || w <= 0 || h <= 0) return
  const pad = Math.min(w, h) * 0.04
  const size = Math.max(0.2, Math.min(w, h) - pad * 2)
  const cell = size / n
  const ox = x + (w - size) / 2
  const oy = y + (h - size) / 2
  pdf.setFillColor(0, 0, 0)
  for (let row = 0; row < n; row++) {
    let col = 0
    while (col < n) {
      if (!matrix[row][col]) { col++; continue }
      let end = col
      while (end < n && matrix[row][end]) end++
      pdf.rect(ox + col * cell, oy + row * cell, (end - col) * cell, cell, 'F')
      col = end
    }
  }
}

function drawBarcode(pdf, text, format, x, y, w, h) {
  if (typeof document === 'undefined' || w <= 0 || h <= 0) return
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  try {
    JsBarcode(svg, text, {
      format: format || 'CODE128',
      displayValue: false,
      margin: 0,
      xmlDocument: document
    })
  } catch (e) {
    return
  }
  const vb = svg.viewBox && svg.viewBox.baseVal
  const totalW = (vb && vb.width) || Number(svg.getAttribute('width')) || 1
  const totalH = (vb && vb.height) || Number(svg.getAttribute('height')) || 1
  pdf.setFillColor(0, 0, 0)
  svg.querySelectorAll('rect').forEach(node => {
    const fill = (node.getAttribute('fill') || '#000').toLowerCase()
    if (fill === '#ffffff' || fill === 'white' || fill === '#fff') return
    const rw = Number(node.getAttribute('width')) || 0
    const rh = Number(node.getAttribute('height')) || 0
    if (rw <= 0 || rh <= 0) return
    const rx = Number(node.getAttribute('x')) || 0
    const ry = Number(node.getAttribute('y')) || 0
    pdf.rect(x + (rx / totalW) * w, y + (ry / totalH) * h, (rw / totalW) * w, (rh / totalH) * h, 'F')
  })
}

function wrapByWidth(pdf, text, maxW, fontMm) {
  const lines = []
  for (const para of String(text).split('\n')) {
    if (!para) { lines.push(''); continue }
    let line = ''
    for (const ch of para) {
      const next = line + ch
      const width = ch.charCodeAt(0) > 255
        ? next.length * fontMm
        : pdf.getTextWidth(next)
      if (line && width > maxW) {
        lines.push(line)
        line = ch
      } else {
        line = next
      }
    }
    lines.push(line)
  }
  return lines
}

function drawLatinText(pdf, text, x, y, w, h, fontPx, align, weight, color, vAlign) {
  const fontMm = pxMm(fontPx || 14)
  const pt = (fontPx || 14) * 72 / 96
  pdf.setFont('helvetica', weight === 'bold' ? 'bold' : 'normal')
  pdf.setFontSize(pt)
  setText(pdf, color || '#000000')
  const lines = wrapByWidth(pdf, text, Math.max(1, w), fontMm)
  const step = fontMm * 1.25
  const block = Math.max(step, lines.length * step)
  let ty = y + fontMm * 0.8
  if (vAlign === 'middle') ty = y + Math.max(fontMm * 0.8, (h - block) / 2 + fontMm * 0.8)
  else if (vAlign === 'bottom') ty = y + Math.max(fontMm * 0.8, h - block + fontMm * 0.8)
  const limit = y + h
  for (const line of lines) {
    if (ty > limit + 0.2) break
    let tx = x
    if (align === 'center' || align === 'right') {
      const lw = pdf.getTextWidth(line)
      tx = align === 'center' ? x + Math.max(0, (w - lw) / 2) : x + Math.max(0, w - lw)
    }
    pdf.text(line, tx, ty)
    ty += step
  }
}

function wrapCanvasLines(ctx, text, maxW) {
  const lines = []
  for (const para of String(text).split('\n')) {
    if (!para) { lines.push(''); continue }
    let line = ''
    for (const glyph of para) {
      const next = line + glyph
      if (line && ctx.measureText(next).width > maxW) {
        lines.push(line)
        line = glyph
      } else line = next
    }
    lines.push(line)
  }
  return lines
}

function lineBox(ctx, lines, size) {
  let ascent = size * 0.92
  let descent = size * 0.24
  for (const line of lines) {
    const m = ctx.measureText(line || '国')
    if (m.actualBoundingBoxAscent) ascent = Math.max(ascent, m.actualBoundingBoxAscent)
    if (m.actualBoundingBoxDescent) descent = Math.max(descent, m.actualBoundingBoxDescent)
  }
  const pad = Math.max(2, size * 0.08)
  const step = ascent + descent + pad
  return { ascent, descent, pad, step, block: Math.max(step, step * lines.length) }
}

function drawCjkText(pdf, text, x, y, w, h, fontPx, align, weight, color, vAlign) {
  if (typeof document === 'undefined' || w <= 0 || h <= 0) return
  const dpi = 300
  const pxPerMm = dpi / 25.4
  const cw = Math.max(1, Math.round(w * pxPerMm))
  const ch = Math.max(1, Math.round(h * pxPerMm))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const face = weight === 'bold' ? 'bold' : 'normal'
  ctx.textBaseline = 'alphabetic'
  let size = Math.max(8, (fontPx || 14) * dpi / 96)
  const applyFont = () => { ctx.font = `${face} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif` }
  applyFont()
  let lines = wrapCanvasLines(ctx, text, cw)
  let box = lineBox(ctx, lines, size)
  for (let i = 0; i < 6 && box.block > ch && size > 8; i++) {
    size = Math.max(8, size * ch / box.block * 0.96)
    applyFont()
    lines = wrapCanvasLines(ctx, text, cw)
    box = lineBox(ctx, lines, size)
  }
  ctx.fillStyle = color || '#000000'
  ctx.textBaseline = 'alphabetic'
  const ink = box.ascent + box.descent
  const block = lines.length * ink + Math.max(0, lines.length - 1) * box.pad
  let top = box.pad
  if (vAlign === 'middle') top = Math.max(0, (ch - block) / 2)
  else if (vAlign === 'bottom') top = Math.max(0, ch - block)
  lines.forEach((line, i) => {
    const baseline = top + box.ascent + i * (ink + box.pad)
    if (baseline - box.ascent > ch) return
    let left = 0
    if (align === 'center' || align === 'right') {
      const lw = ctx.measureText(line).width
      left = align === 'center' ? Math.max(0, (cw - lw) / 2) : Math.max(0, cw - lw)
    }
    ctx.fillText(line, left, baseline)
  })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h)
}

function drawText(pdf, text, x, y, w, h, c) {
  const value = String(text ?? '')
  if (!value.trim() || w <= 0 || h <= 0) return
  const fontPx = c.fontSize || 14
  const align = c.textAlign || 'left'
  const weight = c.fontWeight
  const color = c.fill || '#000000'
  const vAlign = c.vAlign || 'top'
  if (textNeedsOutlineFont(value)) drawCjkText(pdf, value, x, y, w, h, fontPx, align, weight, color, vAlign)
  else drawLatinText(pdf, value, x, y, w, h, fontPx, align, weight, color, vAlign)
}

function drawContainedImage(pdf, src, nw, nh, x, y, w, h) {
  if (!src || nw <= 0 || nh <= 0 || w <= 0 || h <= 0) return
  const ratio = nw / nh
  let dw = w
  let dh = dw / ratio
  if (dh > h) { dh = h; dw = dh * ratio }
  try { pdf.addImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh) } catch (e) { /* 坏图跳过 */ }
}

function drawRect(pdf, c, x, y, w, h) {
  const sw = Math.max(0.05, pxMm(c.strokeWidth || 1))
  pdf.setLineWidth(sw)
  const fill = c.fill && c.fill !== 'transparent' && c.fill !== 'none'
  if (fill) setFill(pdf, c.fill)
  if (c.stroke) setStroke(pdf, c.stroke)
  const mode = fill && c.stroke ? 'FD' : fill ? 'F' : 'S'
  const r = Number(c.rx) || 0
  if (r > 0 && typeof pdf.roundedRect === 'function') pdf.roundedRect(x, y, w, h, r, r, mode)
  else pdf.rect(x, y, w, h, mode)
}

function drawEllipse(pdf, c, x, y, w, h) {
  if (w <= 0 || h <= 0) return
  const sw = Math.max(0.05, pxMm(c.strokeWidth || 1))
  pdf.setLineWidth(sw)
  const fill = c.fill && c.fill !== 'transparent' && c.fill !== 'none'
  if (fill) setFill(pdf, c.fill)
  if (c.stroke) setStroke(pdf, c.stroke)
  const mode = fill && c.stroke ? 'FD' : fill ? 'F' : 'S'
  const cx = x + w / 2
  const cy = y + h / 2
  if (typeof pdf.ellipse === 'function') pdf.ellipse(cx, cy, w / 2, h / 2, mode)
  else pdf.ellipse(cx, cy, w / 2, h / 2, 'S')
}

function drawLine(pdf, c, x, y, w) {
  const sw = Math.max(0.05, pxMm(c.strokeWidth || 1))
  setStroke(pdf, c.stroke || '#000000')
  pdf.setLineWidth(sw)
  pdf.line(x, y + sw / 2, x + w, y + sw / 2)
}

function drawImage(pdf, c, row, x, y, w, h) {
  // 只拦危险协议；正常 http(s)/data:image 与预览一致，不改版式
  const src = safeImageSrc(c.source === 'field' ? (row?.[c.binding] || '') : (c.src || ''))
  if (!src || w <= 0 || h <= 0) return
  try { pdf.addImage(src, x, y, w, h) } catch (e) { /* 跨域或坏图就跳过 */ }
}

function drawCellVisual(pdf, cell, text, x, y, w, h) {
  const type = cell?.type || 'text'
  if ((type === 'barcode' || type === 'qrcode') && String(text || '').trim() && typeof document !== 'undefined') {
    const cv = type === 'qrcode'
      ? qrToCanvas(String(text), 240)
      : barcodeToCanvas(String(text), {
        format: cell.format || 'CODE128',
        targetWidth: barcodePrintPx(w),
        targetHeight: barcodePrintPx(h)
      })
    if (cv) drawContainedImage(pdf, canvasToDataURL(cv), cv.width, cv.height, x, y, w, h)
    return
  }
  if (type === 'image') {
    const src = safeImageSrc(text || cell?.src || '')
    if (src) {
      try { pdf.addImage(src, x, y, w, h) } catch (e) { /* 坏图跳过 */ }
    }
    return
  }
  if (!String(text || '').trim()) return
  drawText(pdf, text, x, y, w, h, {
    fontSize: cell?._fontSize,
    textAlign: cell?._align,
    fontWeight: cell?._weight,
    fill: cell?._fill || cell?.fill || '#111111',
    vAlign: cell?._vAlign || 'middle'
  })
}

function drawTable(pdf, c, row, x, y, w, h) {
  const colW = tableColumnWidths(c, w)
  const rowH = tableRowHeights(c, h)
  const cols = colW.length
  const rows = rowH.length
  const colX = sizeOffsets(colW)
  const rowY = sizeOffsets(rowH)
  const sw = Math.max(0.05, Number(c.borderWidth) || 0.2)
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const header = r === 0 && c.headerRow
      const fill = header ? (c.headerBg || '#f1f5f9') : (c.fill || '#ffffff')
      if (fill && fill !== 'transparent') {
        setFill(pdf, fill)
        pdf.rect(x + colX[col], y + rowY[r], colW[col], rowH[r], 'F')
      }
    }
  }
  // 每条线只画一次。按格子各描一遍时，中间的线会叠成两倍粗。
  setStroke(pdf, c.borderColor || '#333333')
  pdf.setLineWidth(sw)
  const inset = sw / 2
  pdf.rect(x + inset, y + inset, Math.max(0.2, w - sw), Math.max(0.2, h - sw), 'S')
  for (let col = 0; col < cols - 1; col++) {
    const lx = x + colX[col] + colW[col]
    pdf.line(lx, y + inset, lx, y + h - inset)
  }
  for (let r = 0; r < rows - 1; r++) {
    const ly = y + rowY[r] + rowH[r]
    pdf.line(x + inset, ly, x + w - inset, ly)
  }
  const pad = Number(c.cellPadding) || 1
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const cell = c.cells?.[`${r},${col}`] || {}
      const header = r === 0 && c.headerRow
      const text = tableCellText(c, r, col, row)
      const cx = x + colX[col] + pad
      const cy = y + rowY[r] + pad
      const cw = Math.max(1, colW[col] - pad * 2)
      const ch = Math.max(1, rowH[r] - pad * 2)
      drawCellVisual(pdf, {
        ...cell,
        _fontSize: c.fontSize || 10,
        _align: header ? 'center' : (c.textAlign || 'left'),
        _weight: header ? 'bold' : c.fontWeight,
        _vAlign: c.vAlign || 'middle',
        _fill: header ? (c.headerText || '#111111') : (c.cellTextColor || cell.fill || '#111111')
      }, text, cx, cy, cw, ch)
    }
  }
}

function drawComponent(pdf, c, row, ox, oy) {
  if (!c || componentHidden(c, row)) return
  const x = ox + (Number(c.left) || 0)
  const y = oy + (Number(c.top) || 0)
  const w = Number(c.width) || 0
  const h = Number(c.height) || 0
  if (c.type === 'text' || c.type === 'date' || c.type === 'serial' || c.type === 'checkbox') {
    const text = (c.type === 'text')
      ? renderText(c.text || '', row)
      : componentPlainText(c, row)
    drawText(pdf, text, x, y, w, h, c)
  } else if (c.type === 'qrcode') {
    const text = componentPlainText(c, row)
    if (!text) return
    if (typeof document === 'undefined') { drawQr(pdf, text, x, y, w, h); return }
    const cv = qrToCanvas(String(text), 240)
    if (cv) {
      try { pdf.addImage(canvasToDataURL(cv), x, y, w, h) } catch (e) { /* 跳过 */ }
    }
  } else if (c.type === 'barcode') {
    const text = componentPlainText(c, row)
    if (!text) return
    if (typeof document === 'undefined') { drawBarcode(pdf, text, c.format, x, y, w, h); return }
    const cv = barcodeToCanvas(String(text), {
      format: c.format || 'CODE128',
      textRatio: c.textRatio,
      targetWidth: barcodePrintPx(w),
      targetHeight: barcodePrintPx(h)
    })
    if (cv) {
      try { pdf.addImage(canvasToDataURL(cv), x, y, w, h) } catch (e) { /* 跳过 */ }
    }
  } else if (c.type === 'rect') {
    drawRect(pdf, c, x, y, w, h)
  } else if (c.type === 'ellipse') {
    drawEllipse(pdf, c, x, y, w, h)
  } else if (c.type === 'line') {
    drawLine(pdf, c, x, y, w)
  } else if (c.type === 'image') {
    drawImage(pdf, c, row, x, y, w, h)
  } else if (c.type === 'table') {
    drawTable(pdf, c, row, x, y, w, h)
  }
}

function drawLabelChrome(pdf, project, ox, oy) {
  const lb = project.label || {}
  if (!lb.showBorder) return
  const w = Number(lb.width) || 0
  const h = Number(lb.height) || 0
  if (w <= 0 || h <= 0) return
  setStroke(pdf, lb.borderColor || '#000000')
  pdf.setLineWidth(Math.max(0.05, Number(lb.borderWidth) || 0.3))
  pdf.rect(ox, oy, w, h, 'S')
}

/**
 * @param {{ project: object, labels: Array, filename?: string }} args
 * @returns {Promise<number>} 页数
 */
export async function exportVectorPDF({ project, labels, filename }) {
  const paper = project?.paper || { width: 210, height: 297 }
  const pw = Number(paper.width) || 210
  const ph = Number(paper.height) || 297
  const per = (() => {
    const L = project?.layout || {}
    return L.mode === 'auto' ? Math.max(1, (L.cols || 1) * (L.rows || 1)) : 1
  })()
  const pages = paginateLabels(labels, per)
  const orient = pw > ph ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation: orient,
    unit: 'mm',
    format: [pw, ph],
    compress: true
  })
  pages.forEach((page, pi) => {
    if (pi > 0) pdf.addPage([pw, ph], orient)
    page.slots.forEach((slot, si) => {
      if (slot.empty) return
      const box = slotOffsetMm(si, project)
      for (const c of project.components || []) drawComponent(pdf, c, slot.row || {}, box.x, box.y)
      drawLabelChrome(pdf, project, box.x, box.y)
    })
  })
  pdf.save(filename || `${project?.meta?.name || 'label'}.pdf`)
  return pages.length
}
