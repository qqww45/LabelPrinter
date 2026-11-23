/**
 * 工作台行业模板分组（营销站 templatesCatalog 的补充，便于设计师一次找到成品版式）。
 */
import { BUILTIN_TEMPLATES } from './templates.js'

/** @typedef {{ id: string, name: string, nameEn: string, templateIds: string[] }} IndustryCategory */

export const INDUSTRY_CATEGORIES = [
  {
    id: 'price',
    name: '价签',
    nameEn: 'Price / shelf',
    templateIds: ['tpl_grocery_price', 'tpl_retail_shelf_70', 'tpl_price_tag']
  },
  {
    id: 'shipping',
    name: '面单 / 箱唛',
    nameEn: 'Shipping / packing',
    templateIds: ['tpl_express', 'tpl_packing_mark']
  },
  {
    id: 'asset',
    name: '资产贴',
    nameEn: 'Asset tag',
    templateIds: ['tpl_asset_fixed', 'tpl_asset_equipment']
  },
  {
    id: 'apparel',
    name: '服装吊牌',
    nameEn: 'Garment hang tag',
    templateIds: ['tpl_apparel_hang', 'tpl_apparel_size']
  },
  {
    id: 'wash',
    name: '洗水唛',
    nameEn: 'Care / wash label',
    templateIds: ['tpl_wash_care', 'tpl_wash_fold']
  }
]

const byId = new Map(BUILTIN_TEMPLATES.map((t) => [t.id, t]))

export function templatesForIndustry(categoryId) {
  const cat = INDUSTRY_CATEGORIES.find((c) => c.id === categoryId)
  if (!cat) return []
  return cat.templateIds.map((id) => byId.get(id)).filter(Boolean)
}

export function industryForTemplateId(templateId) {
  for (const c of INDUSTRY_CATEGORIES) {
    if (c.templateIds.includes(templateId)) return c
  }
  return null
}

export function featuredIndustryTemplates() {
  const ids = new Set()
  const out = []
  for (const cat of INDUSTRY_CATEGORIES) {
    for (const id of cat.templateIds.slice(0, 1)) {
      if (ids.has(id)) continue
      const tpl = byId.get(id)
      if (tpl) {
        ids.add(id)
        out.push({ category: cat, template: tpl })
      }
    }
  }
  return out
}