/**
 * 本地 SVG 图标库（原创简易符号，非爬取竞品资源）。
 * 列表预览用 SVG；插入画布 / PDF 用 PNG（见 rasterImage.js）。
 */
import { rasterizeDataUrlToPng } from './rasterImage.js'

/** @typedef {{ id: string, name: string, category: string, tags: string[], svg: string }} AssetIcon */

const CE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#fff"/><text x="24" y="32" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#1a1a1a">CE</text></svg>`

const FCC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40"><rect width="64" height="40" rx="4" fill="#fff" stroke="#1a1a1a" stroke-width="2"/><text x="32" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700">FCC</text></svg>`

const ROHS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="#fff" stroke="#15803d" stroke-width="3"/><text x="28" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="#15803d">RoHS</text><path d="M18 36h20" stroke="#15803d" stroke-width="2"/><path d="M22 32l4 8 8-16 4 8" fill="none" stroke="#15803d" stroke-width="2"/></svg>`

const UKCA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><rect width="52" height="52" fill="#fff"/><text x="26" y="34" text-anchor="middle" font-size="20" font-weight="700">UKCA</text></svg>`

const WASH_30 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" fill="none" stroke="#1a1a1a" stroke-width="2"/><path d="M12 28c4-8 20-8 24 0" fill="none" stroke="#1a1a1a" stroke-width="2"/><text x="24" y="38" text-anchor="middle" font-size="11">30°</text></svg>`

const WASH_NO_BLEACH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" fill="none" stroke="#1a1a1a" stroke-width="2"/><path d="M16 32h16M24 16v16" stroke="#c00" stroke-width="2.5"/></svg>`

const GHS_FLAME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><polygon points="28,4 52,48 4,48" fill="#fff" stroke="#c00" stroke-width="2"/><path d="M28 18c4 10-2 14 0 22 6-4 8-12 4-18 4 6 2 16-6 20 2-12-4-18 2-24z" fill="#f97316"/></svg>`

const GHS_CORROSIVE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><polygon points="28,4 52,48 4,48" fill="#fff" stroke="#000" stroke-width="2"/><rect x="22" y="22" width="4" height="16" fill="#000"/><path d="M18 40h20" stroke="#000" stroke-width="3"/></svg>`

const ARROW_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 4 L28 20 H20 V28 H12 V20 H4 Z" fill="currentColor"/></svg>`

const RECYCLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M16 8l8 14h-6l4 18-14-8 4-10h-8z M32 8l-8 14h6l-4 18 14-8-4-10h8z" fill="none" stroke="#15803d" stroke-width="2"/></svg>`

/** @type {AssetIcon[]} */
export const ICON_LIBRARY = [
  { id: 'ce', name: 'CE', category: '认证', tags: ['ce', 'eu'], svg: CE },
  { id: 'fcc', name: 'FCC', category: '认证', tags: ['fcc', 'us'], svg: FCC },
  { id: 'rohs', name: 'RoHS', category: '认证', tags: ['rohs', '环保'], svg: ROHS },
  { id: 'ukca', name: 'UKCA', category: '认证', tags: ['uk', 'ukca'], svg: UKCA },
  { id: 'wash30', name: '水洗 30°C', category: '洗水唛', tags: ['wash', 'textile'], svg: WASH_30 },
  { id: 'no_bleach', name: '禁漂白', category: '洗水唛', tags: ['bleach'], svg: WASH_NO_BLEACH },
  { id: 'ghs_flame', name: '易燃', category: 'GHS', tags: ['ghs', 'fire'], svg: GHS_FLAME },
  { id: 'ghs_corrosive', name: '腐蚀', category: 'GHS', tags: ['ghs', 'acid'], svg: GHS_CORROSIVE },
  { id: 'arrow_up', name: '向上', category: '包装', tags: ['arrow', 'this way up'], svg: ARROW_UP },
  { id: 'recycle', name: '回收', category: '环保', tags: ['recycle'], svg: RECYCLE }
]

export function iconCategories() {
  const set = new Set(ICON_LIBRARY.map(i => i.category))
  return [...set]
}

export function filterIcons(query, category = '') {
  const q = String(query || '').trim().toLowerCase()
  const cat = String(category || '').trim()
  return ICON_LIBRARY.filter(i => {
    if (cat && i.category !== cat) return false
    if (!q) return true
    const hay = `${i.name} ${i.category} ${i.tags.join(' ')}`.toLowerCase()
    return hay.includes(q)
  })
}

export function iconById(id) {
  return ICON_LIBRARY.find(i => i.id === id) || null
}

/** data URL，供 image 组件 src */
export function iconToDataUrl(iconOrId) {
  const icon = typeof iconOrId === 'string' ? iconById(iconOrId) : iconOrId
  if (!icon?.svg) return ''
  const svg = icon.svg.replace(/currentColor/g, '#1a1a1a')
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

/** 图标库不依赖登录或远程 CDN */
export function assetLibraryIsFullyLocal() {
  return ICON_LIBRARY.every(i => i.svg && !/^https?:/i.test(i.svg))
}

/** 插入图片组件：栅格化为 PNG，保证 PDF / jsPDF 可嵌入 */
export async function iconToPngDataUrl(iconOrId, maxPx = 192) {
  const svgUrl = iconToDataUrl(iconOrId)
  if (!svgUrl) return ''
  return rasterizeDataUrlToPng(svgUrl, maxPx)
}