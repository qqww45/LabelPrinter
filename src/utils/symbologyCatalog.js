/**
 * 条码 / 二维码分组目录（本地目录，无远程拉取）。
 * id 与画布组件上的 format 一致；二维走 bwip bcid（见 twoDCode.js）。
 */

/** @typedef {{ id: string, name: string, hint: string, jsBarcode?: string, dim?: '1d'|'2d' }} SymItem */

/** @type {{ key: string, name: string, items: SymItem[] }[]} */
export const ONED_SYMBOLOGY_GROUPS = [
  {
    key: 'general',
    name: '通用',
    items: [
      { id: 'CODE128', name: 'CODE 128', hint: '通用可变长度', jsBarcode: 'CODE128', dim: '1d' },
      { id: 'CODE128A', name: 'CODE 128A', hint: '大写与数字', jsBarcode: 'CODE128A', dim: '1d' },
      { id: 'CODE128B', name: 'CODE 128B', hint: '全 ASCII', jsBarcode: 'CODE128B', dim: '1d' },
      { id: 'CODE128C', name: 'CODE 128C', hint: '纯数字压缩', jsBarcode: 'CODE128C', dim: '1d' },
      { id: 'CODE39', name: 'CODE 39', hint: '工业字母数字', jsBarcode: 'CODE39', dim: '1d' },
      { id: 'CODABAR', name: 'Codabar', hint: '库德巴', jsBarcode: 'codabar', dim: '1d' }
    ]
  },
  {
    key: 'retail',
    name: '零售',
    items: [
      { id: 'EAN13', name: 'EAN-13', hint: '商品 13 位', jsBarcode: 'EAN13', dim: '1d' },
      { id: 'EAN8', name: 'EAN-8', hint: '商品 8 位', jsBarcode: 'EAN8', dim: '1d' },
      { id: 'UPC', name: 'UPC-A', hint: '北美 12 位', jsBarcode: 'UPC', dim: '1d' }
    ]
  },
  {
    key: 'logistics',
    name: '物流/邮政',
    items: [
      { id: 'ITF14', name: 'ITF-14', hint: '外箱 14 位', jsBarcode: 'ITF14', dim: '1d' },
      { id: 'ITF', name: 'ITF', hint: '交叉 25', jsBarcode: 'ITF', dim: '1d' }
    ]
  }
]

/** @type {{ key: string, name: string, items: SymItem[] }[]} */
export const TWOD_SYMBOLOGY_GROUPS = [
  {
    key: 'common',
    name: '常用',
    items: [
      { id: 'QR', name: 'QR Code', hint: '通用二维码', dim: '2d' },
      { id: 'PDF417', name: 'PDF417', hint: '物流/证件叠层码', dim: '2d' },
      { id: 'DATAMATRIX', name: 'Data Matrix', hint: '小空间零件/UDI', dim: '2d' },
      { id: 'AZTEC', name: 'Aztec', hint: '交通/票据', dim: '2d' },
      { id: 'MICROQR', name: 'Micro QR', hint: '极小区域', dim: '2d' },
      { id: 'HANXIN', name: '汉信码', hint: '国标二维', dim: '2d' }
    ]
  }
]

const ONED_FLAT = new Map()
for (const g of ONED_SYMBOLOGY_GROUPS) {
  for (const it of g.items) ONED_FLAT.set(it.id.toUpperCase(), it)
}

const TWOD_FLAT = new Map()
for (const g of TWOD_SYMBOLOGY_GROUPS) {
  for (const it of g.items) TWOD_FLAT.set(it.id.toUpperCase(), it)
}

export function lookup1DSymbology(id) {
  return ONED_FLAT.get(String(id || 'CODE128').toUpperCase()) || ONED_FLAT.get('CODE128')
}

export function lookup2DSymbology(id) {
  return TWOD_FLAT.get(String(id || 'QR').toUpperCase()) || TWOD_FLAT.get('QR')
}

export function jsBarcodeFormat(componentFormat) {
  const meta = lookup1DSymbology(componentFormat)
  return meta?.jsBarcode || String(componentFormat || 'CODE128')
}

export function allSymbologyIdsLocal() {
  const ids = []
  for (const g of ONED_SYMBOLOGY_GROUPS) ids.push(...g.items.map(i => i.id))
  for (const g of TWOD_SYMBOLOGY_GROUPS) ids.push(...g.items.map(i => i.id))
  return ids
}

/** 插入画布时的合法样例值（长度 + 校验位，Codabar 含起止符） */
const SAMPLE_1D = {
  CODE128: '1234567890',
  CODE128A: 'CODE128A',
  CODE128B: 'Code 128B',
  CODE128C: '123456789012',
  CODE39: 'CODE39',
  CODABAR: 'A40156B',
  EAN13: '6901234567892',
  EAN8: '96385074',
  UPC: '036000291452',
  ITF14: '10012345678907',
  ITF: '2401234567'
}

export function sample1DBarcodeValue(formatId) {
  const id = String(formatId || 'CODE128').toUpperCase()
  return SAMPLE_1D[id] || SAMPLE_1D.CODE128
}

export function sample2DCodeValue() {
  return 'https://ci64.com/'
}