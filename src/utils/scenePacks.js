/**
 * 行业场景包：模板 + 示例表 + 说明（无账号分享 = 导出项目 JSON）。
 * UI 可逐步挂到引导 / 模板库；此处为单一数据定义。
 */
export const SCENE_PACKS = [
  {
    id: 'retail-price',
    name: '生鲜价签',
    templateId: 'tpl_retail_shelf_70',
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
  },
  {
    id: 'jewelry',
    name: '珠宝吊牌',
    templateId: 'tpl_jewelry',
    sampleId: 'jewelry',
    blurb: '品名、克重、工费与小条码'
  },
  {
    id: 'apparel',
    name: '服装吊牌',
    templateId: 'tpl_apparel_hang',
    sampleId: 'apparel',
    blurb: '款号、尺码、颜色、吊牌价'
  },
  {
    id: 'retail-shelf',
    name: '货架条',
    templateId: 'tpl_shelf_strip',
    sampleId: 'retail',
    blurb: '宽条价签：品名、货位、价格'
  },
  {
    id: 'retail-barcode',
    name: '条码标签',
    templateId: 'tpl_barcode_tag',
    sampleId: 'retail',
    blurb: '50×30 条码 + 品名'
  },
  {
    id: 'retail-goods',
    name: '商品信息表',
    templateId: 'tpl_goods_sheet',
    sampleId: 'retail',
    blurb: '80×50 表格价签'
  },
  {
    id: 'retail-price-60',
    name: '价签 60×40',
    templateId: 'tpl_price_tag',
    sampleId: 'retail',
    blurb: '经典 60×40 价签'
  }
]

export function getScenePack(id) {
  return SCENE_PACKS.find((p) => p.id === id) || null
}
