/**
 * 营销壳插图资产（public/marketing/*.webp）— 标本/产品示意，非贴物场景摄影
 */
import { SCENE_PACKS } from '../utils/scenePacks.js'
import { getTemplateCatalog } from '../utils/templatesCatalog.js'

const BASE = '/marketing'

const SPECIMEN = {
  priceTag: {
    src: `${BASE}/sample-price-tag.webp`,
    alt: '超市生鲜价签设计标本'
  },
  waybill: {
    src: `${BASE}/sample-waybill.webp`,
    alt: '快递面单标签标本'
  },
  assetTag: {
    src: `${BASE}/sample-asset-tag.webp`,
    alt: '设备资产编号贴标本'
  },
  binLabel: {
    src: `${BASE}/sample-bin-label.webp`,
    alt: '仓库库位条码签标本'
  },
  jewelryTag: {
    src: `${BASE}/sample-jewelry-tag.webp`,
    alt: '珠宝吊牌价签标本'
  },
  apparelTag: {
    src: `${BASE}/sample-apparel-tag.webp`,
    alt: '服装吊牌标本'
  },
  stickers: {
    src: `${BASE}/hero-label-stickers.webp`,
    alt: '多种行业标签标本组合'
  },
  laptopEditor: {
    src: `${BASE}/hero-laptop-editor.webp`,
    alt: '浏览器中的标签设计工作台与价签预览'
  }
}

export const HERO = SPECIMEN.laptopEditor

/** 三步区可选小图（首页默认用数字卡片，不强制展示） */
export const STEPS = {
  1: SPECIMEN.priceTag,
  2: SPECIMEN.laptopEditor,
  3: SPECIMEN.waybill
}

export const SCENES = {
  'retail-price': SPECIMEN.priceTag,
  express: SPECIMEN.waybill,
  asset: SPECIMEN.assetTag,
  warehouse: SPECIMEN.binLabel,
  jewelry: SPECIMEN.jewelryTag,
  apparel: SPECIMEN.apparelTag,
  'retail-shelf': SPECIMEN.priceTag,
  'retail-barcode': SPECIMEN.priceTag,
  'retail-goods': SPECIMEN.priceTag,
  'retail-price-60': SPECIMEN.priceTag
}

/** @type {Record<string, { src: string, alt: string }>} */
export const TEMPLATE_COVERS = {
  tpl_grocery_price: SPECIMEN.priceTag,
  tpl_express: SPECIMEN.waybill,
  tpl_asset_fixed: SPECIMEN.assetTag,
  tpl_warehouse_bin: SPECIMEN.binLabel,
  tpl_jewelry: SPECIMEN.jewelryTag,
  tpl_apparel_hang: SPECIMEN.apparelTag,
  tpl_shelf_strip: SPECIMEN.priceTag,
  tpl_barcode_tag: SPECIMEN.priceTag,
  tpl_goods_sheet: SPECIMEN.priceTag,
  tpl_price_tag: SPECIMEN.priceTag
}

export const HELP_BAND = SPECIMEN.stickers

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
