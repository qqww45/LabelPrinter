import QRCode from 'qrcode'

/**
 * 生成二维码 dataURL
 */
export async function generateQRCode(text, options = {}) {
  const opts = {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
    ...options
  }
  return await QRCode.toDataURL(text || ' ', opts)
}

/**
 * 生成 SVG
 */
export async function generateQRCodeSVG(text, options = {}) {
  const opts = {
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    ...options
  }
  return await QRCode.toString(text || ' ', opts)
}
