/**
 * 行业场景包：模板 + 示例表 + 说明（无账号分享 = 导出项目 JSON）。
 * UI 可逐步挂到引导 / 模板库；此处为单一数据定义。
 */
export const SCENE_PACKS = [
  {
    id: 'retail-price',
    name: '生鲜价签',
    templateId: 'tpl_grocery_price',
    sampleId: 'retail',
    blurb: '品名、规格、价格、条码 — 适合超市与生鲜价签',
    mergeKeyHints: ['条码', '货号'],
    welcomeLabel: '价签'
  },
  {
    id: 'express',
    name: '快递面单',
    templateId: 'tpl_express',
    sampleId: 'express',
    blurb: '收件人、电话、地址、运单号',
    mergeKeyHints: ['运单号', '单号'],
    welcomeLabel: '快递面单'
  },
  {
    id: 'asset',
    name: '资产贴',
    templateId: 'tpl_asset_fixed',
    sampleId: 'asset',
    blurb: '资产编号、部门、保管人',
    mergeKeyHints: ['资产编号', '编号'],
    welcomeLabel: '资产贴'
  },
  {
    id: 'warehouse',
    name: '库位条码',
    templateId: 'tpl_warehouse_bin',
    sampleId: 'warehouse',
    blurb: '库位、SKU、品名'
  }
]

export function getScenePack(id) {
  return SCENE_PACKS.find((p) => p.id === id) || null
}
