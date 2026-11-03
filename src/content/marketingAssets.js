/**
 * 营销壳资产（public/marketing/*.webp）
 * 截自本地 /app 画布与界面（与 ci64.com 同源），非 AI 假图。
 */
import { SCENE_PACKS } from '../utils/scenePacks.js'
import { getTemplateCatalog } from '../utils/templatesCatalog.js'

const BASE = '/marketing'

const SPECIMEN = {
  priceTag: {
    src: `${BASE}/sample-price-tag.webp`,
    alt: '签立方画布导出的生鲜价签预览（示例数据）'
  },
  waybill: {
    src: `${BASE}/sample-waybill.webp`,
    alt: '签立方画布导出的快递面单预览（示例数据）'
  },
  assetTag: {
    src: `${BASE}/sample-asset-tag.webp`,
    alt: '签立方画布导出的资产贴预览（示例数据）'
  },
  binLabel: {
    src: `${BASE}/sample-bin-label.webp`,
    alt: '签立方画布导出的库位签预览（示例数据）'
  },
  jewelryTag: {
    src: `${BASE}/sample-jewelry-tag.webp`,
    alt: '签立方画布导出的珠宝吊牌预览（示例数据）'
  },
  apparelTag: {
    src: `${BASE}/sample-apparel-tag.webp`,
    alt: '签立方画布导出的服装吊牌预览（示例数据）'
  },
  stickers: {
    src: `${BASE}/hero-label-stickers.webp`,
    alt: '多种模板画布预览标本条'
  },
  appEditor: {
    src: `${BASE}/hero-app-editor.webp`,
    alt: '签立方标签设计工作台界面截图'
  }
}

export const HERO = SPECIMEN.appEditor

/** 三步区可选小图（首页默认用数字卡片，不强制展示） */
export const STEPS = {
  1: SPECIMEN.priceTag,
  2: SPECIMEN.appEditor,
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
