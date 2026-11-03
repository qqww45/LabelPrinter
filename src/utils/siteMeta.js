import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL, REPO_URL } from './site.js'

/** 社交分享与 og:image 默认图（public/marketing/） */
export const OG_IMAGE_URL = `${OFFICIAL_SITE_ORIGIN}/marketing/hero-app-editor.webp`

const HOME_TITLE = '签立方：免费在线标签打印，可免费 AI排版'
const HOME_DESCRIPTION =
  '免费标签打印工具签立方。导入 Excel，按行打价签、条码和面单。可免费 AI排版，不用填密钥；再批量打印或导出 PDF。数据留在浏览器。'

/** @type {Record<string, { title: string, description: string, robots: string, canonicalPath: string }>} */
export const ROUTE_SITE_META = {
  '/': {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    robots: 'index,follow',
    canonicalPath: '/'
  },
  '/templates': {
    title: '模板库：价签、面单与资产贴模板｜签立方',
    description:
      '免费在线标签模板库。按行业、尺寸与用途筛选价签、快递面单、资产贴等模板，预览字段说明，一键套用进工作台并带示例数据。',
    robots: 'index,follow',
    canonicalPath: '/templates'
  },
  '/help': {
    title: '帮助手册：Excel 批量打印、条码与 AI 排版｜签立方',
    description:
      '签立方使用手册：导入 Excel/CSV、字段映射、条形码与二维码、拼版打印与 PDF 导出、默认可免费 AI 排版（可选自备 API Key）。',
    robots: 'index,follow',
    canonicalPath: '/help'
  },
  '/app': {
    title: '在线标签设计工作台｜签立方',
    description:
      '签立方标签设计与打印工作台。导入表格、绑定字段、批量打印或导出 PDF。默认可免费 AI 排版，可选自备 API Key。',
    robots: 'noindex,follow',
    canonicalPath: '/app'
  }
}

/**
 * @param {string} path — Vue route path (no query/hash)
 * @returns {string}
 */
export function canonicalUrlForPath(path) {
  const meta = ROUTE_SITE_META[path]
  if (!meta) return OFFICIAL_SITE_URL
  if (meta.canonicalPath === '/') return OFFICIAL_SITE_URL
  return `${OFFICIAL_SITE_ORIGIN}${meta.canonicalPath}`
}

/**
 * @param {string} path
 * @returns {(typeof ROUTE_SITE_META)[string] | null}
 */
export function siteMetaForPath(path) {
  return ROUTE_SITE_META[path] ?? null
}

function upsertMetaByName(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertMetaByProperty(property, content) {
  let el = document.head.querySelector(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * 路由切换后更新 document 级 SEO 标签（SPA 无 SSR 时的客户端补偿）。
 * @param {string} path
 */
export function applyRouteSiteMeta(path) {
  if (typeof document === 'undefined') return
  const meta = siteMetaForPath(path) ?? ROUTE_SITE_META['/']
  const canonical = canonicalUrlForPath(path)

  document.title = meta.title
  upsertMetaByName('description', meta.description)
  upsertMetaByName('robots', meta.robots)
  upsertCanonical(canonical)

  upsertMetaByProperty('og:title', meta.title)
  upsertMetaByProperty('og:description', meta.description)
  upsertMetaByProperty('og:url', canonical)
  upsertMetaByProperty('og:image', OG_IMAGE_URL)

  upsertMetaByName('twitter:title', meta.title)
  upsertMetaByName('twitter:description', meta.description)
  upsertMetaByName('twitter:image', OG_IMAGE_URL)
}
