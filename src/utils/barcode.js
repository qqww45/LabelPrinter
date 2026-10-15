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
  const tryFormats = [opts.format]
  // 指定格式失败时降级到 CODE128
  if (opts.format !== 'CODE128') tryFormats.push('CODE128')

  for (const format of tryFormats) {
    try {
      JsBarcode(canvas, text || ' ', { ...opts, format })
      return canvas.toDataURL('image/png')
    } catch (e) {
      // 尝试下一个格式
    }
  }
  console.error('条形码生成失败:', text)
  return ''
}
