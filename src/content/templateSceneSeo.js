/**
 * 模板场景落地页 /templates/{slug}：6 个高意图场景，与 SCENE_PACKS、内置模板一致。
 */
import { getScenePack } from '../utils/scenePacks.js'
import { filterTemplateCatalog, getTemplateCatalog } from '../utils/templatesCatalog.js'
import { SCENES } from './marketingAssets.js'
import { OFFICIAL_SITE_ORIGIN } from '../utils/site.js'

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 首页「常见场景」卡片（与 HomeView 一致） */
export const HOME_FEATURED_SCENE_IDS = [
  'retail-price',
  'express',
  'asset',
  'warehouse',
  'jewelry',
  'apparel'
]

/** @type {readonly string[]} */
export const TEMPLATE_SCENE_SLUGS = [
  'retail-price',
  'express',
  'asset',
  'apparel',
  'retail-shelf',
  'warehouse'
]

/** @type {Record<string, string | null>} */
export const TEMPLATE_SCENE_USE_CASE = {
  'retail-price': '/use-cases/price-tag',
  express: '/use-cases/shipping-label',
  asset: '/use-cases/asset-tag',
  apparel: '/use-cases/clothing-hangtag',
  'retail-shelf': '/use-cases/shelf-barcode',
  warehouse: null
}

const SCENE_PAGE_COPY = {
  'retail-price': {
    title: '生鲜价签模板：超市 Excel 按行打印｜签立方',
    description:
      '免费生鲜与超市价签模板：品名、规格、价格、条码字段已预留。导入 Excel 套用 60×40 等纸型，批量打印或导出 PDF，数据留在浏览器。',
    h1: '生鲜价签模板：品名、价格与条码批量打印',
    lede:
      '内置超市价签版式已绑定常见列名；套用后进工作台会载入示例表，可立即预览。导入自己的 Excel 后按行打印，无需注册，表格不上传服务器。',
    workflow:
      '价签场景建议在打印前开启「打印前体检」，自动检查空价格、缺条码或条码位数异常（见帮助专题）。矢量 PDF 会保留红色价格等画布配色。',
    relatedHelp: '/help/preflight'
  },
  express: {
    title: '快递面单模板：运单号与收件信息批量打印｜签立方',
    description:
      '免费快递面单模板：收件人、电话、地址、运单号与二维码。Excel 按行出面单，支持浏览器打印与矢量 PDF。',
    h1: '快递面单模板：收件信息与运单二维码',
    lede:
      '物流组模板含运单条码/二维码位；套用示例数据可看拼版效果。电商发货表按行导入即可批量打印，默认可免费 AI 调整字号与字段排版。',
    workflow:
      '体检会校验手机号格式与空收件人。导出 PDF 与画布预览共用渲染引擎；需要热敏打印机时可从打印设置生成 TSPL/ZPL 指令。',
    relatedHelp: '/help/pdf-export'
  },
  asset: {
    title: '资产贴模板：编号条码与部门信息｜签立方',
    description:
      '固定资产标签模板：资产编号、部门、保管人与条码。Excel 导入按行打印，项目保存在本机浏览器，无账号。',
    h1: '资产贴模板：固定资产编号与条码',
    lede:
      '资产场景模板预留编号、部门字段；套用后可在数据面板追加、按主键更新或替换表格。条码组件绑定「资产编号」或 SKU 列即可扫码盘点。',
    workflow:
      '切换项目前会自动把表格写回该项目；重要资产表请额外导出 Excel 或项目 JSON 备份。',
    relatedHelp: '/help/local-storage'
  },
  apparel: {
    title: '服装吊牌模板：款号尺码与吊牌价｜签立方',
    description:
      '免费服装吊牌模板：款号、颜色、尺码、吊牌价与小条码。导入 Excel 批量打印吊牌，支持 A4 拼版。',
    h1: '服装吊牌模板：款号、尺码与吊牌价',
    lede:
      '吊牌模板支持文本表达式与按列份数：例如一行数据印多枚尺码标。纸张设置可调毫米尺寸与一页多枚行列间距。',
    workflow:
      '字段映射可记忆表头：相同 Excel 列名再次导入时可恢复上次对齐关系（见字段映射帮助）。',
    relatedHelp: '/help/field-mapping'
  },
  'retail-shelf': {
    title: '货架条模板：宽条价签与货位价格｜签立方',
    description:
      '货架条与宽条价签模板：品名、货位、价格；适合超市货架与促销条，Excel 按行批量打印。',
    h1: '货架条模板：宽条价签、货位与价格',
    lede:
      '货架条模板在较长纸型上排品名与价格；与 50×30 条码贴同属零售场景，可在模板库继续按尺寸筛选。',
    workflow:
      '条码与二维码组件绑定 SKU 或货位列；打印、PNG 与矢量 PDF 输出一致。',
    relatedHelp: '/help/barcodes'
  },
  warehouse: {
    title: '库位条码模板：货架位与 SKU｜签立方',
    description:
      '仓储库位标签模板：库位、SKU、品名与条码。Excel 按行打印库位签，适合仓库分拣与盘点。',
    h1: '库位条码模板：库位、SKU 与品名',
    lede:
      '仓储组模板默认绑定库位与 SKU 字段；套用示例可看 50×30 等条码贴效果。无云端账号，数据跟随项目存在浏览器。',
    workflow:
      '导入时可选追加或按条码/SKU 主键更新，适合每周刷新库存表只改数量与库位。',
    relatedHelp: '/help/excel-import'
  }
}

/**
 * @param {string} path
 * @returns {string | null}
 */
/**
 * Vue Router 目标：有落地页走 `/templates/{id}`，否则模板库筛选。
 * @param {string} sceneId
 */
export function templateSceneRouteTarget(sceneId) {
  const id = String(sceneId || '')
  if (TEMPLATE_SCENE_SLUGS.includes(id)) {
    return { path: `/templates/${id}` }
  }
  return { path: '/templates', query: { scene: id } }
}

/**
 * @param {string} sceneId
 * @returns {boolean}
 */
export function hasTemplateSceneLanding(sceneId) {
  return TEMPLATE_SCENE_SLUGS.includes(String(sceneId || ''))
}

export function parseTemplateSceneSlug(path) {
  const m = String(path || '').match(/^\/templates\/([^/]+)$/)
  if (!m) return null
  const slug = m[1]
  return TEMPLATE_SCENE_SLUGS.includes(slug) ? slug : null
}

/**
 * @param {string} slug
 * @returns {{ title: string, description: string, robots: string, canonicalPath: string }}
 */
export function siteMetaForTemplateScene(slug) {
  const copy = SCENE_PAGE_COPY[slug]
  if (!copy) throw new Error(`unknown template scene: ${slug}`)
  return {
    title: copy.title,
    description: copy.description,
    robots: 'index,follow',
    canonicalPath: `/templates/${slug}`
  }
}

/** @param {{ label: string, href?: string }[]} crumbs */
export function renderBreadcrumbHtml(crumbs) {
  const items = crumbs
    .map(
      (c, i) =>
        i === crumbs.length - 1 || !c.href ?
          `<li aria-current="page">${escapeHtml(c.label)}</li>`
        : `<li><a href="${c.href}">${escapeHtml(c.label)}</a></li>`
    )
    .join('')
  return `<nav class="seo-breadcrumb" aria-label="面包屑"><ol>${items}</ol></nav>`
}

/**
 * @param {string} slug
 * @returns {string}
 */
export function renderTemplateSceneBodyHtml(slug) {
  const pack = getScenePack(slug)
  const copy = SCENE_PAGE_COPY[slug]
  if (!pack || !copy) return ''

  const catalog = filterTemplateCatalog(getTemplateCatalog(), { scene: slug })
  const tplList = catalog
    .map(
      (r) =>
        `<li><strong>${escapeHtml(r.name)}</strong>（${escapeHtml(r.size)} mm）— ${escapeHtml(r.desc || '')}；字段：${escapeHtml((r.fields || []).slice(0, 6).join('、') || '见工作台')} · <a href="/templates?scene=${encodeURIComponent(slug)}">在库中筛选</a></li>`
    )
    .join('')

  const mergeHints =
    pack.mergeKeyHints?.length ?
      `<p>导入合并时常用主键列：<strong>${escapeHtml(pack.mergeKeyHints.join('、'))}</strong>（适合按主键更新价格或库位）。</p>`
    : ''

  const sceneImg = SCENES[slug]
  const figure =
    sceneImg ?
      `<figure class="seo-figure"><img src="${sceneImg.src}" alt="${escapeHtml(sceneImg.alt)}" width="800" height="530" loading="lazy" /></figure>`
    : ''

  const useCase = TEMPLATE_SCENE_USE_CASE[slug]
  const useCaseLink =
    useCase ? `<li><a href="${useCase}">场景落地页</a>（工作流与 FAQ）</li>` : ''

  const crumbs = renderBreadcrumbHtml([
    { label: '首页', href: '/' },
    { label: '模板库', href: '/templates' },
    { label: pack.name }
  ])

  return `
  <article id="seo-static-main" class="seo-static-main" lang="zh-CN">
    ${crumbs}
    <header class="seo-hero">
      <h1>${escapeHtml(copy.h1)}</h1>
      <p class="seo-lede">${escapeHtml(copy.lede)}</p>
      <nav class="seo-actions" aria-label="快捷入口">
        <a href="/templates?scene=${encodeURIComponent(slug)}">在模板库中筛选</a>
        <a href="/app">打开工作台套用</a>
        <a href="${copy.relatedHelp}">相关帮助</a>
      </nav>
    </header>
    <section class="seo-block"><h2>本场景内置模板</h2>
      <ul class="seo-list">${tplList || '<li>见 <a href="/templates">模板库</a> 按场景筛选。</li>'}</ul>
      ${mergeHints}
    </section>
    <section class="seo-block"><h2>三步套用</h2>
      <ol class="seo-steps">
        <li>点「在模板库中筛选」或下方列表，选中模板后「使用此模板」（会载入示例数据）。</li>
        <li>导入 Excel/CSV，用 <a href="/help/field-mapping">字段映射</a> 对齐表头。</li>
        <li>预览后打印或 <a href="/help/pdf-export">导出 PDF</a>；${escapeHtml(copy.workflow)}</li>
      </ol>
      ${figure}
    </section>
    <section class="seo-block"><h2>相关链接</h2>
      <ul class="seo-list">
        ${useCaseLink}
        <li><a href="/help">帮助首页</a></li>
        <li><a href="/templates">全部模板</a></li>
      </ul>
    </section>
  </article>`
}

/**
 * @param {string} slug
 */
export function jsonLdTemplateScene(slug) {
  const pack = getScenePack(slug)
  const copy = SCENE_PAGE_COPY[slug]
  if (!pack || !copy) return []
  const catalog = filterTemplateCatalog(getTemplateCatalog(), { scene: slug })
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: copy.h1,
      description: copy.description,
      url: `${OFFICIAL_SITE_ORIGIN}/templates/${slug}`,
      inLanguage: 'zh-CN',
      isPartOf: { '@type': 'WebSite', name: '签立方', url: `${OFFICIAL_SITE_ORIGIN}/` }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${pack.name}模板`,
      itemListElement: catalog.slice(0, 12).map((row, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: row.name,
        description: `${row.size} mm`
      }))
    }
  ]
}