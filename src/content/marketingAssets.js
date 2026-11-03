/**
 * 营销壳摄影资产映射（public/marketing/*.webp）
 */
import { SCENE_PACKS } from '../utils/scenePacks.js'
import { getTemplateCatalog } from '../utils/templatesCatalog.js'

const BASE = '/marketing'

export const HERO = {
  src: `${BASE}/hero-shelf-price.webp`,
  alt: '超市货架上的生鲜价签贴在商品旁'
}

export const STEPS = {
  1: { src: `${BASE}/step-pick.webp`, alt: '在模板库挑选价签版式' },
  2: { src: `${BASE}/step-import.webp`, alt: '将 Excel 表格导入工作台' },
  3: { src: `${BASE}/step-print.webp`, alt: '批量预览后打印或导出 PDF' }
}

export const SCENES = {
  'retail-price': { src: `${BASE}/scene-retail.webp`, alt: '超市货架价签场景' },
  express: { src: `${BASE}/scene-express.webp`, alt: '快递包裹上的面单标签' },
  asset: { src: `${BASE}/scene-asset.webp`, alt: '设备上的资产编号贴' },
  warehouse: { src: `${BASE}/scene-warehouse.webp`, alt: '仓库货架库位条码签' },
  jewelry: { src: `${BASE}/scene-jewelry.webp`, alt: '珠宝吊牌与价签' },
  apparel: { src: `${BASE}/scene-apparel.webp`, alt: '服装吊牌场景' },
  'retail-shelf': { src: `${BASE}/scene-retail.webp`, alt: '货架条价签场景' },
  'retail-barcode': { src: `${BASE}/scene-retail.webp`, alt: '条码标签场景' },
  'retail-goods': { src: `${BASE}/scene-retail.webp`, alt: '商品信息价签场景' },
  'retail-price-60': { src: `${BASE}/scene-retail.webp`, alt: '经典价签场景' }
}

/** @type {Record<string, { src: string, alt: string }>} */
export const TEMPLATE_COVERS = {
  tpl_grocery_price: SCENES['retail-price'],
  tpl_express: SCENES.express,
  tpl_asset_fixed: SCENES.asset,
  tpl_warehouse_bin: SCENES.warehouse,
  tpl_jewelry: SCENES.jewelry,
  tpl_apparel_hang: SCENES.apparel,
  tpl_shelf_strip: SCENES['retail-shelf'],
  tpl_barcode_tag: SCENES['retail-barcode'],
  tpl_goods_sheet: SCENES['retail-goods'],
  tpl_price_tag: SCENES['retail-price-60']
}

export const HELP_BAND = {
  src: `${BASE}/help-band.webp`,
  alt: '工作台旁的标签卷与已贴好的标签'
}

const catalogSceneByTemplate = () => {
  const map = new Map()
  for (const entry of getTemplateCatalog()) {
    map.set(entry.templateId, entry.scene)
  }
  return map
}

let _templateSceneMap = null
function sceneIdForTemplate(templateId) {
  if (!_templateSceneMap) _templateSceneMap = catalogSceneByTemplate()
  const fromCatalog = _templateSceneMap.get(templateId)
  if (fromCatalog && SCENES[fromCatalog]) return fromCatalog
  const pack = SCENE_PACKS.find((p) => p.templateId === templateId)
  if (pack && SCENES[pack.id]) return pack.id
  return 'retail-price'
}

/**
 * @param {'hero'|'step'|'scene'|'template'|'help'} kind
 * @param {string|number} [id]
 * @returns {{ src: string, alt: string }}
 */
export function resolveMarketingAsset(kind, id) {
  switch (kind) {
    case 'hero':
      return HERO
    case 'help':
      return HELP_BAND
    case 'step': {
      const key = Number(id) || 1
      return STEPS[key] || STEPS[1]
    }
    case 'scene': {
      if (id && SCENES[id]) return SCENES[id]
      return SCENES['retail-price']
    }
    case 'template': {
      if (id && TEMPLATE_COVERS[id]) return TEMPLATE_COVERS[id]
      const sceneId = id ? sceneIdForTemplate(String(id)) : 'retail-price'
      return SCENES[sceneId] || HERO
    }
    default:
      return HERO
  }
}
