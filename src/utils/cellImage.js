import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

/**
 * 同步生成二维码 canvas（用于 canvas 内即时渲染，无需等待异步加载）
 * 用 QRCode.create 拿到模块矩阵后手工绘制
 */
export function qrToCanvas(text, px = 200, opts = {}) {
  const value = String(text == null || text === '' ? ' ' : text)
  const qr = QRCode.create(value, { errorCorrectionLevel: opts.errorCorrectionLevel || 'M' })
  const size = qr.modules.size
  const data = qr.modules.data
  const margin = opts.margin == null ? 1 : opts.margin       // 单位：模块数
  const total = size + margin * 2
  const scale = Math.max(1, Math.round(px / total))
  const cv = document.createElement('canvas')
  cv.width = cv.height = total * scale
  const ctx = cv.getContext('2d')
  ctx.fillStyle = opts.light || '#ffffff'
  ctx.fillRect(0, 0, cv.width, cv.height)
  ctx.fillStyle = opts.dark || '#000000'
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (data[r * size + c]) {
        ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale)
      }
    }
  }
  return cv
}

/**
 * 同步生成条形码 canvas（JsBarcode 为同步绘制）
 */
export function barcodeToCanvas(text, opts = {}) {
  const value = text == null ? '' : String(text).trim()
  if (!value) return null
  const cv = document.createElement('canvas')
  const base = {
    format: opts.format || 'CODE128',
    width: 2,
    height: 60,
    displayValue: opts.displayValue !== false,
    fontSize: 14,
    margin: 4,
    background: '#ffffff',
    lineColor: '#000000'
  }
  try {
    JsBarcode(cv, value, base)
    return cv
  } catch (e) {
    return null
  }
}

/**
 * 把 canvas 转成 dataURL（用于预览/导出，浏览器端缓存）
 */
export function canvasToDataURL(cv) {
  if (!cv) return ''
  return cv.toDataURL('image/png')
}
