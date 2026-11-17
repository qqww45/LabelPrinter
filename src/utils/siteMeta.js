import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL, REPO_URL } from './site.js'

/** 社交分享与 og:image 默认图（public/marketing/，JPG 便于百度与微信抓取） */
export const OG_IMAGE_URL = `${OFFICIAL_SITE_ORIGIN}/marketing/hero-app-editor.jpg`
export const OG_IMAGE_TYPE = 'image/jpeg'

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
    title: '签立方模板库：免费价签、条码与面单模板',
    description:
      '浏览免费价签、条码、快递面单与资产贴模板。按行业与纸型筛选，预览字段说明，一键套用进工作台，导入数据后即可打印或导出 PDF。',
    robots: 'index,follow',
    canonicalPath: '/templates'
  },
  '/help': {
    title: '签立方帮助：导入 Excel、排版与打印导出',
    description:
      '签立方使用说明：导入 Excel 或 CSV、绑定字段与条码、毫米纸张与拼版、批量打印与矢量 PDF 导出；默认可免费 AI 排版，数据留在浏览器。',
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
  upsertMetaByProperty('og:image:type', OG_IMAGE_TYPE)

  upsertMetaByName('twitter:title', meta.title)
  upsertMetaByName('twitter:description', meta.description)
  upsertMetaByName('twitter:image', OG_IMAGE_URL)
}
