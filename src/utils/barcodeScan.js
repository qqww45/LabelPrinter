function ean13ChecksumOk(value) {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(value[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (sum % 10)) % 10 === Number(value[12])
}

function ean8ChecksumOk(value) {
  let sum = 0
  for (let i = 0; i < 7; i++) sum += Number(value[i]) * (i % 2 === 0 ? 3 : 1)
  return (10 - (sum % 10)) % 10 === Number(value[7])
}

function upcAChecksumOk(value) {
  let sum = 0
  for (let i = 0; i < 11; i++) sum += Number(value[i]) * (i % 2 === 0 ? 3 : 1)
  return (10 - (sum % 10)) % 10 === Number(value[11])
}

/** 与 JsBarcode ITF14：前 13 位权重 3,1,3,1… */
export function itf14CheckDigit(body13) {
  const res = String(body13 || '')
    .substr(0, 13)
    .split('')
    .map((num) => Number(num))
    .reduce((sum, n, idx) => sum + (n * (3 - (idx % 2) * 2)), 0)
  return Math.ceil(res / 10) * 10 - res
}

function itf14ChecksumOk(value) {
  if (!/^\d{14}$/.test(value)) return false
  return Number(value[13]) === itf14CheckDigit(value)
}

/**
 * 当前这一行、这种格式、这个格子，扫码枪大概能不能读。
 * 返回代号，界面自己翻译。
 */
export function barcodeScanIssue({ format, value, widthMm, heightMm } = {}) {
  const v = String(value ?? '').trim()
  const fmt = String(format || 'CODE128').toUpperCase()
  if (!v) return 'empty'
  if (fmt === 'EAN13') {
    if (!/^\d{13}$/.test(v)) return 'ean13'
    if (!ean13ChecksumOk(v)) return 'ean-check'
  }
  if (fmt === 'EAN8') {
    if (!/^\d{8}$/.test(v)) return 'ean8'
    if (!ean8ChecksumOk(v)) return 'ean-check'
  }
  if (fmt === 'UPC' || fmt === 'UPCA') {
    if (!/^\d{12}$/.test(v)) return 'upca'
    if (!upcAChecksumOk(v)) return 'ean-check'
  }
  if (fmt === 'ITF14') {
    if (!/^\d{14}$/.test(v)) return 'itf14'
    if (!itf14ChecksumOk(v)) return 'itf-check'
  }
  if (fmt === 'CODE39' && /[^0-9A-Z .\-$/+%]/.test(v)) return 'code39'
  if (fmt === 'CODABAR' && !/^[A-Da-d].*[A-Da-d]$/.test(v)) return 'codabar'
  const h = Number(heightMm) || 0
  const w = Number(widthMm) || 0
  if (h > 0 && h < 6) return 'short'
  if (w > 0 && v.length >= 8 && w < v.length * 1.1) return 'narrow'
  return 'ok'
}

const SCAN_TEXT = {
  empty: '这一行是空的，打出来扫不了',
  ean13: 'EAN-13 需要 13 位数字',
  ean8: 'EAN-8 需要 8 位数字',
  upca: 'UPC-A 需要 12 位数字',
  itf14: 'ITF-14 需要 14 位数字',
  'itf-check': 'ITF-14 校验位不对，扫出来会失败',
  'ean-check': '校验位不对，扫出来会失败',
  'ean-check-ean13': 'EAN-13 校验位不对，扫出来会失败',
  'ean-check-ean8': 'EAN-8 校验位不对，扫出来会失败',
  'ean-check-upc': 'UPC-A 校验位不对，扫出来会失败',
  codabar: 'Codabar 需以 A–D 起止',
  code39: 'CODE39 只接受大写字母、数字和 - . $ / + % 空格',
  short: '格子太矮，条可能扫不稳',
  narrow: '格子偏窄，左右空白可能不够',
  ok: '按当前格式和格子，这一行可以扫'
}

export function barcodeScanText(code, format) {
  if (code === 'ean-check') {
    const fmt = String(format || 'CODE128').toUpperCase()
    if (fmt === 'EAN8') return SCAN_TEXT['ean-check-ean8']
    if (fmt === 'UPC' || fmt === 'UPCA') return SCAN_TEXT['ean-check-upc']
    if (fmt === 'EAN13') return SCAN_TEXT['ean-check-ean13']
    return SCAN_TEXT['ean-check']
  }
  if (code === 'itf-check') return SCAN_TEXT['itf-check']
  return SCAN_TEXT[code] || SCAN_TEXT.ok
}
