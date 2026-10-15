import QRCode from 'qrcode'

/** 二维码模块矩阵（1 为黑）。矢量 PDF 按格子画矩形，不把整张图贴进去。 */
export function qrMatrix(text, errorCorrectionLevel = 'M') {
  const value = text == null ? '' : String(text)
  if (!value) return []
  const qr = QRCode.create(value, { errorCorrectionLevel })
  const n = qr.modules.size
  const rows = []
  for (let y = 0; y < n; y++) {
    const row = new Array(n)
    for (let x = 0; x < n; x++) row[x] = qr.modules.get(x, y) ? 1 : 0
    rows.push(row)
  }
  return rows
}
