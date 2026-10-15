import JsBarcode from 'jsbarcode'

/**
 * 生成条形码 dataURL
 */
export function generateBarcode(text, options = {}) {
  const canvas = document.createElement('canvas')
  const opts = {
    format: 'CODE128',
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 14,
    margin: 4,
    background: '#ffffff',
    lineColor: '#000000',
    ...options
  }
  const value = text == null ? '' : String(text).trim()
  if (!value) return ''
  try {
    JsBarcode(canvas, value, opts)
    return canvas.toDataURL('image/png')
  } catch (e) {
    console.error('条形码生成失败:', value, opts.format)
    return ''
  }
}
