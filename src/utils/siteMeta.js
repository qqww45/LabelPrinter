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
  },
  '/en': {
    title: 'LabelCube — free online label printing from Excel',
    description:
      'Batch-print price tags, barcodes and shipping labels in the browser. Import Excel, optional free AI layout. No signup; data stays on your device.',
    robots: 'index,follow',
    canonicalPath: '/en'
  },
  '/privacy': {
    title: '签立方隐私与数据说明',
    description:
      '签立方无需注册：表格与项目默认保存在本机浏览器。说明本地存储、AI 可选密钥请求与站点托管方式。',
    robots: 'index,follow',
    canonicalPath: '/privacy'
  },
  '/use-cases/price-tag': {
    title: '超市价签打印：Excel 按行批量出价签｜签立方',
    description:
      '免费在线价签打印：导入品名、规格、价格与条码，套用模板后批量打印或导出 PDF。数据留在浏览器。',
    robots: 'index,follow',
    canonicalPath: '/use-cases/price-tag'
  },
  '/use-cases/shipping-label': {
    title: '快递面单批量打印｜签立方',
    description:
      '按 Excel 行打印收件人、电话、地址与运单二维码；电商发货表批量出面单，免费在线无需安装。',
    robots: 'index,follow',
    canonicalPath: '/use-cases/shipping-label'
  },
  '/use-cases/asset-tag': {
    title: '固定资产标签打印｜签立方',
    description:
      '资产编号、部门与条码吊牌；导入表格按行打印，扫码盘点。无账号，本地保存。',
    robots: 'index,follow',
    canonicalPath: '/use-cases/asset-tag'
  },
  '/use-cases/shelf-barcode': {
    title: '货架条码与货架条打印｜签立方',
    description:
      '库位、SKU 与品名绑定条码或宽条货架签，Excel 按行批量打印。',
    robots: 'index,follow',
    canonicalPath: '/use-cases/shelf-barcode'
  },
  '/use-cases/clothing-hangtag': {
    title: '服装吊牌打印｜签立方',
    description:
      '款号、尺码、颜色与吊牌价：套用服装吊牌模板，导入 Excel 批量打印。',
    robots: 'index,follow',
    canonicalPath: '/use-cases/clothing-hangtag'
  },
  '/help/excel-import': {
    title: '导入 Excel 批量打标签｜签立方帮助',
    description:
      '签立方如何导入 Excel/CSV：追加、按主键更新或替换；字段映射与表头对齐说明。',
    robots: 'index,follow',
    canonicalPath: '/help/excel-import'
  },
  '/help/barcodes': {
    title: '条形码与二维码打印｜签立方帮助',
    description:
      '在标签上绑定条码或二维码列，预览、打印与 PDF 输出一致；免费在线条码打印。',
    robots: 'index,follow',
    canonicalPath: '/help/barcodes'
  },
  '/help/ai-layout': {
    title: 'AI 排版说明｜签立方帮助',
    description:
      '默认可免费 AI 排版，不用填密钥；可选自备 API Key。不用 AI 时数据不发送。',
    robots: 'index,follow',
    canonicalPath: '/help/ai-layout'
  },
  '/help/pdf-export': {
    title: '导出 PDF 与打印｜签立方帮助',
    description:
      '矢量 PDF、PNG 与浏览器打印；中文嵌入、拉丁字色与画布预览一致。',
    robots: 'index,follow',
    canonicalPath: '/help/pdf-export'
  },
  '/help/local-storage': {
    title: '本地保存与无登录｜签立方帮助',
    description:
      '项目与表格保存在浏览器 localStorage/IndexedDB，无需注册；如何备份与隐私说明。',
    robots: 'index,follow',
    canonicalPath: '/help/local-storage'
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
