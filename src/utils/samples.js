/**
 * 内置示例数据包：fetch public/samples/*.csv → parseCSVText
 * 不改打印/PDF 路径；导入仍走 App.applyImported（追加/替换确认）
 *
 * suggestedTemplateIds：字段与示例列对齐的内置模板；应用模板时可一并灌入。
 * 约定：每个内置模板至少挂到一个示例包。
 */

export const SAMPLE_DATASETS = [
  {
    id: 'retail',
    name: '零售价签示例',
    desc: '品名 / 产品名称 / 规格 / 价格 / 条码，适配价签与货架',
    path: '/samples/sample-retail.csv',
    fileName: 'sample-retail.csv',
    suggestedTemplateIds: [
      'tpl_grocery_price',
      'tpl_shelf_strip',
      'tpl_price_tag',
      'tpl_goods_sheet',
      'tpl_barcode_tag',
      'tpl_qr_tag',
      'tpl_shelf_a4'
    ]
  },
  {
    id: 'express',
    name: '快递面单示例',
    desc: '收件人 / 电话 / 地址 / 单号',
    path: '/samples/sample-express.csv',
    fileName: 'sample-express.csv',
    suggestedTemplateIds: ['tpl_express']
  },
  {
    id: 'asset',
    name: '固定资产示例',
    desc: '资产编号 / 名称 / 部门 / 保管人',
    path: '/samples/sample-asset.csv',
    fileName: 'sample-asset.csv',
    suggestedTemplateIds: ['tpl_asset_fixed']
  },
  {
    id: 'jewelry',
    name: '珠宝签示例',
    desc: '品名 / 克重 / 工费 / 条码',
    path: '/samples/sample-jewelry.csv',
    fileName: 'sample-jewelry.csv',
    suggestedTemplateIds: ['tpl_jewelry']
  },
  {
    id: 'apparel',
    name: '服装吊牌示例',
    desc: '款号 / 尺码 / 颜色 / 吊牌价 / 条码',
    path: '/samples/sample-apparel.csv',
    fileName: 'sample-apparel.csv',
    suggestedTemplateIds: ['tpl_apparel_hang']
  },
  {
    id: 'warehouse',
    name: '库位签示例',
    desc: '库位 / SKU / 品名',
    path: '/samples/sample-warehouse.csv',
    fileName: 'sample-warehouse.csv',
    suggestedTemplateIds: ['tpl_warehouse_bin']
  }
]

export function getSampleDataset(id) {
  return SAMPLE_DATASETS.find(s => s.id === id) || null
}

/** 按模板 id 找匹配的示例包；无对齐示例时返回 null */
export function findSampleIdForTemplate(templateId) {
  if (!templateId) return null
  for (const s of SAMPLE_DATASETS) {
    if (s.suggestedTemplateIds?.includes(templateId)) return s.id
  }
  return null
}

export function findSampleForTemplate(templateId) {
  const id = findSampleIdForTemplate(templateId)
  return id ? getSampleDataset(id) : null
}

/** 拉取并解析示例 CSV；失败抛带中文说明的 Error */
export async function loadSampleDataset(id) {
  const meta = getSampleDataset(id)
  if (!meta) throw new Error(`未知示例：${id}`)
  const res = await fetch(meta.path)
  if (!res.ok) throw new Error(`示例文件加载失败（${res.status}）`)
  const text = await res.text()
  const { parseCSVText } = await import('./excel.js')
  const parsed = parseCSVText(text)
  const headers = (parsed.headers || []).map(s => String(s || '').replace(/^\uFEFF/, '').trim())
  const rows = parsed.rows || []
  if (!headers.length) throw new Error('示例文件没有列名')
  return { headers, rows, fileName: meta.fileName, sampleId: meta.id }
}
