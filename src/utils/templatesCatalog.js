import { BUILTIN_TEMPLATES } from './templates.js'
import { findSampleIdForTemplate } from './samples.js'
import { SCENE_PACKS, getScenePack } from './scenePacks.js'

const SCENE_ALIAS = {
  'retail-price': ['retail-price', 'retail', 'price'],
  express: ['express', 'logistics'],
  asset: ['asset'],
  warehouse: ['warehouse'],
  jewelry: ['jewelry'],
  apparel: ['apparel'],
  'retail-shelf': ['retail-shelf', 'retail-price'],
  'retail-barcode': ['retail-barcode', 'warehouse', 'retail-price']
}

const PURPOSE_LABELS = {
  price: '价签',
  label: '面单',
  asset: '资产',
  warehouse: '仓库',
  batch: '批量',
  hangtag: '吊牌'
}

/** @param {typeof BUILTIN_TEMPLATES[0]} tpl */
export function templateSizeKey(tpl) {
  const w = tpl.label?.width ?? tpl.paper?.width ?? 0
  const h = tpl.label?.height ?? tpl.paper?.height ?? 0
  return `${w}x${h}`
}

function purposeForTemplate(tpl) {
  const g = tpl.group || ''
  if (g === '物流') return 'label'
  if (g === '资产') return 'asset'
  if (g === '仓储') return 'warehouse'
  if (g === '批量') return 'batch'
  if (tpl.id === 'tpl_jewelry') return 'hangtag'
  if (tpl.id === 'tpl_apparel_hang') return 'hangtag'
  return 'price'
}

function sceneForTemplateId(templateId) {
  const pack = SCENE_PACKS.find((p) => p.templateId === templateId)
  if (pack) return pack.id
  const tpl = BUILTIN_TEMPLATES.find((t) => t.id === templateId)
  if (!tpl) return 'retail-price'
  if (tpl.group === '物流') return 'express'
  if (tpl.group === '资产') return 'asset'
  if (tpl.group === '仓储') return 'warehouse'
  if (tpl.id === 'tpl_jewelry') return 'jewelry'
  if (tpl.id === 'tpl_apparel_hang') return 'apparel'
  return 'retail-price'
}

let _catalogCache = null

export function getTemplateCatalog() {
  if (_catalogCache) return _catalogCache
  _catalogCache = BUILTIN_TEMPLATES.map((tpl) => ({
    templateId: tpl.id,
    name: tpl.name,
    desc: tpl.desc,
    group: tpl.group,
    fields: tpl.fields || [],
    size: templateSizeKey(tpl),
    scene: sceneForTemplateId(tpl.id),
    purpose: purposeForTemplate(tpl),
    sampleId: findSampleIdForTemplate(tpl.id)
  }))
  return _catalogCache
}

export function getSceneFilterOptions() {
  const seen = new Map()
  for (const p of SCENE_PACKS) {
    seen.set(p.id, p.name)
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }))
}

export function getSizeFilterOptions(catalog = getTemplateCatalog()) {
  const sizes = [...new Set(catalog.map((c) => c.size))].sort()
  return sizes.map((size) => ({ id: size, name: `${size} mm` }))
}

export function getPurposeFilterOptions() {
  return Object.entries(PURPOSE_LABELS).map(([id, name]) => ({ id, name }))
}

function sceneMatches(entryScene, filterScene) {
  if (!filterScene) return true
  if (entryScene === filterScene) return true
  const aliases = SCENE_ALIAS[entryScene] || SCENE_ALIAS[filterScene] || []
  return aliases.includes(filterScene)
}

/** @param {{ scene?: string, size?: string, purpose?: string, q?: string }} filters */
export function filterTemplateCatalog(catalog, filters = {}) {
  const q = (filters.q || '').trim().toLowerCase()
  return catalog.filter((entry) => {
    if (!sceneMatches(entry.scene, filters.scene)) return false
    if (filters.size && entry.size !== filters.size) return false
    if (filters.purpose && entry.purpose !== filters.purpose) return false
    if (q) {
      const hay = `${entry.name} ${entry.desc} ${entry.fields.join(' ')}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export function catalogEntryForPack(packId) {
  const pack = getScenePack(packId)
  if (!pack) return null
  return getTemplateCatalog().find((c) => c.templateId === pack.templateId) || null
}
