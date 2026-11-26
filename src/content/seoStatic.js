/**
 * 无 JS 首屏与 prerender 正文、JSON-LD 单一来源。
 * 构建后 scripts/prerender-route-html.mjs 写入各路由 index.html。
 */
import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL, REPO_URL } from '../utils/site.js'
import { ROUTE_SITE_META } from '../utils/siteMeta.js'
import { getTemplateCatalog } from '../utils/templatesCatalog.js'
import { SCENE_PACKS, getScenePack } from '../utils/scenePacks.js'
import { HOME_FAQ, EN_HOME_FAQ, ORGANIZATION_DISAMBIGUATION } from './seoFaq.js'
import {
  TEMPLATE_SCENE_SLUGS,
  parseTemplateSceneSlug,
  renderTemplateSceneBodyHtml,
  renderBreadcrumbHtml,
  jsonLdTemplateScene
} from './templateSceneSeo.js'

/** @deprecated use SITEMAP_ENTRIES[routePath].lastmod */
export const SEO_LASTMOD = '2026-11-23'

/**
 * Per-URL sitemap lastmod (content change date, not build stamp).
 * Technical-only head/body wrapper changes on / and /en are dated 2026-11-24; other pages unchanged.
 * @type {Record<string, { lastmod: string, changefreq: string, priority: string }>}
 */
export const SITEMAP_ENTRIES = {
  '/': { lastmod: '2026-11-24', changefreq: 'weekly', priority: '1.0' },
  '/en': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.75' },
  '/templates': { lastmod: '2026-11-24', changefreq: 'weekly', priority: '0.9' },
  '/help': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.8' },
  '/help/excel-import': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/barcodes': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/ai-layout': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/pdf-export': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/local-storage': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/field-mapping': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.7' },
  '/help/preflight': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.7' },
  '/help/paper-layout': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.7' },
  '/privacy': { lastmod: '2026-11-18', changefreq: 'yearly', priority: '0.5' },
  '/use-cases/price-tag': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.78' },
  '/use-cases/shipping-label': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.78' },
  '/use-cases/asset-tag': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.78' },
  '/use-cases/shelf-barcode': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.78' },
  '/use-cases/clothing-hangtag': { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.78' },
  ...Object.fromEntries(
    TEMPLATE_SCENE_SLUGS.map((slug) => [
      `/templates/${slug}`,
      { lastmod: '2026-11-24', changefreq: 'monthly', priority: '0.82' }
    ])
  )
}

/** @param {string} s */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @param {string} jpg @param {number} w @param {number} h @param {string} alt */
function marketingPicture(jpg, w, h, alt) {
  const webp = jpg.replace(/\.jpg$/, '.webp')
  return `<picture>
    <source type="image/webp" srcset="${webp}" />
    <img src="${jpg}" width="${w}" height="${h}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />
  </picture>`
}

const PRODUCT_JPGS = `
  <section id="seo-product-shots" aria-label="签立方产品与标签打印样例">
    ${marketingPicture('/marketing/hero-app-editor.jpg', 1200, 750, '签立方在线标签设计工作台界面：画布、组件栏与数据表批量打印')}
    ${marketingPicture('/marketing/sample-price-tag.jpg', 800, 530, '签立方价签打印预览：品名、规格、价格与条码')}
    ${marketingPicture('/marketing/sample-waybill.jpg', 800, 530, '签立方快递面单打印预览：收件信息与运单二维码')}
    ${marketingPicture('/marketing/hero-label-stickers.jpg', 1200, 320, '签立方多种价签、条码与吊牌模板画布预览标本')}
  </section>`

function faqSection(faqs) {
  const items = faqs
    .map(
      (f) =>
        `<details class="seo-faq-item"><summary><h3>${escapeHtml(f.q)}</h3></summary><p>${escapeHtml(f.a)}</p></details>`
    )
    .join('\n')
  return `<section class="seo-block" id="seo-faq"><h2>常见问题</h2>${items}</section>`
}

function homeBody() {
  const scenes = [
    ['价签 / 产品标签', '品名、规格、价格与条码，适合超市与门店。', '/templates/retail-price', '价签模板场景'],
    ['快递面单', '收件人、电话、地址与运单二维码。', '/templates/express', '面单模板场景'],
    ['资产标签', '资产编号、部门与条码，方便盘点。', '/templates/asset', '资产贴场景'],
    ['货架条', '宽条价签、货位与价格。', '/templates/retail-shelf', '货架条场景'],
    ['库位条码', '库位、SKU 与品名条码贴。', '/templates/warehouse', '库位场景'],
    ['服装吊牌', '款号、尺码、颜色与吊牌价。', '/templates/apparel', '服装吊牌场景'],
    ['珠宝吊牌', '品名、克重、工费与小条码。', '/templates?scene=jewelry', '珠宝模板筛选']
  ]
  const sceneHtml = scenes
    .map(
      ([name, desc, href, linkLabel]) =>
        `<li><strong>${escapeHtml(name)}</strong> — ${escapeHtml(desc)} <a href="${href}">${escapeHtml(linkLabel)}</a></li>`
    )
    .join('')

  return `
  <article id="seo-static-main" class="seo-static-main" lang="zh-CN">
    <header class="seo-hero">
      <p class="seo-kicker">免费在线标签打印 · Excel 按行出签</p>
      <h1>签立方：免费在线标签打印，导入 Excel 按行打印价签、条码与面单</h1>
      <p class="seo-lede">在浏览器里设计标签，导入 Excel 或 CSV，批量预览、打印或导出 PDF。支持条形码、二维码、文本表达式、按列份数、A4 拼版与热敏 TSPL/ZPL。默认可免费 AI 排版，不用注册；项目与表格只保存在本机浏览器（localStorage + IndexedDB），不上传服务器。</p>
      <nav class="seo-actions" aria-label="快捷入口">
        <a href="/templates">浏览模板库</a>
        <a href="/app">打开工作台</a>
        <a href="/help">使用帮助</a>
        <a href="/en">English</a>
      </nav>
    </header>
    <section class="seo-block"><h2>三步上手</h2>
      <ol class="seo-steps">
        <li><strong>选模板</strong> — 在 <a href="/templates">模板库</a> 按行业挑价签、条码或面单，一键套用。</li>
        <li><strong>导入表格</strong> — Excel/CSV 首行为字段名；<a href="/help/excel-import">导入说明</a> 与字段映射见帮助。</li>
        <li><strong>批量输出</strong> — 预览后浏览器打印，或 <a href="/help/pdf-export">导出矢量 PDF</a>、PNG。</li>
      </ol>
    </section>
    <section class="seo-block"><h2>常见场景</h2><ul class="seo-list">${sceneHtml}</ul></section>
    <section class="seo-block"><h2>产品能力</h2>
      <ul class="seo-list">
        <li>毫米级纸张与 <a href="/help/paper-layout">A4 拼版</a>；条形码、二维码绑定数据列</li>
        <li>文本表达式（{{字段}}、join、ifempty）、按列份数、图片 URL/Base64 字段</li>
        <li><a href="/help/preflight">打印前体检</a>：缺字段、空价格、纸张放不下等自动提示</li>
        <li><a href="/help/field-mapping">字段映射</a>与表头记忆；追加 / 按主键更新 / 替换导入</li>
        <li><a href="/help/ai-layout">免费 AI 排版</a>（默认内置模型，可选自备密钥）</li>
        <li><a href="/help/local-storage">本地保存</a>：项目与表格留在浏览器，无需账号</li>
        <li>打印中心队列、矢量 PDF/PNG 与画布预览一致；热敏指令可下载</li>
      </ul>
    </section>
    ${faqSection(HOME_FAQ)}
    <p class="seo-note">${escapeHtml(ORGANIZATION_DISAMBIGUATION)}</p>
  </article>
  ${PRODUCT_JPGS}`
}

function templatesBody() {
  const catalog = getTemplateCatalog()
  const byGroup = new Map()
  for (const row of catalog) {
    const g = row.group || '其他'
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g).push(row)
  }
  let lists = ''
  for (const [group, rows] of byGroup) {
    const items = rows
      .map(
        (r) =>
          `<li><strong>${escapeHtml(r.name)}</strong>（${escapeHtml(r.size)} mm）— ${escapeHtml(r.desc || '')}；字段示例：${escapeHtml((r.fields || []).slice(0, 5).join('、') || '见工作台')} · <a href="/app">套用</a></li>`
      )
      .join('')
    lists += `<section class="seo-block"><h2>${escapeHtml(group)}模板</h2><ul class="seo-list">${items}</ul></section>`
  }
  const featuredScenes = TEMPLATE_SCENE_SLUGS.map((id) => getScenePack(id)).filter(Boolean)
  const sceneLinks = featuredScenes
    .map(
      (p) =>
        `<li><a href="/templates/${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a> — ${escapeHtml(p.blurb)} · <a href="/templates?scene=${encodeURIComponent(p.id)}">在库中筛选</a></li>`
    )
    .join('')
  const moreScenes = SCENE_PACKS.filter((p) => !TEMPLATE_SCENE_SLUGS.includes(p.id))
    .map(
      (p) => `<li><a href="/templates?scene=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a> — ${escapeHtml(p.blurb)}</li>`
    )
    .join('')

  return `
  <article id="seo-static-main" class="seo-static-main" lang="zh-CN">
    <header class="seo-hero">
      <h1>签立方模板库：免费价签、条码、面单与资产贴模板</h1>
      <p class="seo-lede">按行业与纸型浏览内置模板，查看尺寸与字段说明，一键套用进工作台后导入 Excel 按行打印。</p>
      <nav class="seo-actions"><a href="/app">打开工作台</a><a href="/">返回首页</a><a href="/help">帮助</a></nav>
    </header>
    <section class="seo-block"><h2>场景落地页</h2><ul class="seo-list">${sceneLinks}</ul></section>
    <section class="seo-block"><h2>更多场景筛选</h2><ul class="seo-list">${moreScenes}</ul></section>
    ${lists}
    <section class="seo-block"><h2>相关场景页</h2>
      <ul class="seo-list">
        <li><a href="/use-cases/price-tag">超市价签打印</a></li>
        <li><a href="/use-cases/shipping-label">快递面单批量打印</a></li>
        <li><a href="/use-cases/asset-tag">固定资产标签</a></li>
        <li><a href="/use-cases/shelf-barcode">货架条码</a></li>
        <li><a href="/use-cases/clothing-hangtag">服装吊牌</a></li>
      </ul>
    </section>
  </article>
  ${PRODUCT_JPGS}`
}

function helpBody() {
  const chapters = [
    ['快速开始', '/', '首页与模板库入口'],
    ['导入 Excel/CSV', '/help/excel-import', '追加、替换与主键更新'],
    ['字段映射', '/help/field-mapping', '表头对齐与「用上次映射」'],
    ['条形码与二维码', '/help/barcodes', '绑定列与打印输出'],
    ['纸张与拼版', '/help/paper-layout', '毫米纸型与一页多枚'],
    ['打印前体检', '/help/preflight', '缺字段与场景行校验'],
    ['AI 排版', '/help/ai-layout', '默认可免费使用'],
    ['PDF 与导出', '/help/pdf-export', '矢量 PDF 与配色一致'],
    ['本地保存与隐私', '/help/local-storage', '无账号、数据在浏览器']
  ]
  const links = chapters
    .map(
      ([title, href, blurb]) =>
        `<li><a href="${href}">${escapeHtml(title)}</a> — ${escapeHtml(blurb)}</li>`
    )
    .join('')

  return `
  <article id="seo-static-main" class="seo-static-main" lang="zh-CN">
    <header class="seo-hero">
      <h1>签立方帮助：导入 Excel、排版与打印导出</h1>
      <p class="seo-lede">签立方把表格每一行印成一张标签。下列专题解答导入、字段映射、条码、拼版、体检、AI 排版、PDF 与本地数据；下方三步流程与首页一致。完整分章手册可在 <a href="/help">/help</a> 页面交互浏览（左侧目录锚点）。</p>
      <nav class="seo-actions"><a href="/templates">模板库</a><a href="/app">工作台</a></nav>
    </header>
    <section class="seo-block"><h2>帮助专题</h2><ul class="seo-list">${links}</ul></section>
    <section class="seo-block"><h2>三步流程</h2>
      <ol class="seo-steps">
        <li>在 <a href="/templates">模板库</a> 选模板并套用。</li>
        <li>导入 Excel/CSV，用字段映射对齐表头。</li>
        <li>预览后打印或导出 PDF；数据不上传服务器。</li>
      </ol>
    </section>
    ${faqSection(HOME_FAQ.slice(0, 4))}
  </article>`
}

/** @param {{ h1: string, lede: string, sections: {h2:string, html:string}[], faq?: typeof HOME_FAQ, links?: {href:string,label:string}[], breadcrumbs?: {label:string,href?:string}[] }} cfg */
function docBody(cfg) {
  const secs = cfg.sections
    .map((s) => `<section class="seo-block"><h2>${escapeHtml(s.h2)}</h2>${s.html}</section>`)
    .join('')
  const nav = (cfg.links || [])
    .map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`)
    .join(' · ')
  const faq = cfg.faq?.length ? faqSection(cfg.faq) : ''
  const crumbs = cfg.breadcrumbs?.length ? renderBreadcrumbHtml(cfg.breadcrumbs) : ''
  return `
  <article id="seo-static-main" class="seo-static-main" lang="zh-CN">
    ${crumbs}
    <header class="seo-hero">
      <h1>${escapeHtml(cfg.h1)}</h1>
      <p class="seo-lede">${escapeHtml(cfg.lede)}</p>
      ${nav ? `<nav class="seo-actions">${nav}</nav>` : ''}
    </header>
    ${secs}
    ${faq}
  </article>`
}

const USE_CASES = {
  '/use-cases/price-tag': {
    h1: '超市价签打印：Excel 按行批量出价签',
    lede: '导入品名、规格、价格与条码列，套用价签模板后批量打印或导出 PDF。支持按列份数、文本表达式与打印前体检（空价格/条码会提示）。免费在线，无需注册。',
    img: '/marketing/sample-price-tag.jpg',
    imgAlt: '价签打印样例：品名、价格与条码',
    templateQuery: 'retail-price',
    faq: [
      {
        q: '价签支持红色价格字吗？',
        a: '支持。画布与矢量 PDF 导出会保留文字颜色，与预览一致。'
      },
      {
        q: '常用纸型？',
        a: '内置 60×40、80×50 等毫米模板；可在纸张设置里改尺寸与 A4 拼版。'
      }
    ]
  },
  '/use-cases/shipping-label': {
    h1: '快递面单批量打印：Excel 导入收件信息',
    lede: '按行打印收件人、电话、地址与运单二维码；适合电商发货表批量出面单。体检会检查手机号格式；可导出 PDF 或热敏 TSPL/ZPL。',
    img: '/marketing/sample-waybill.jpg',
    imgAlt: '快递面单打印样例',
    templateQuery: 'express',
    faq: [
      { q: '运单号如何绑定？', a: '把二维码或条码组件绑定到「运单号」列，预览按行生成。' }
    ]
  },
  '/use-cases/asset-tag': {
    h1: '固定资产标签：编号条码盘点',
    lede: '资产编号、部门、保管人写在标签上并打条码，扫码盘点；数据留在浏览器。',
    img: '/marketing/sample-asset-tag.webp',
    imgAlt: '资产标签打印样例',
    templateQuery: 'asset',
    faq: [{ q: '需要联网保存吗？', a: '不需要。项目保存在本机浏览器，无账号。' }]
  },
  '/use-cases/shelf-barcode': {
    h1: '货架条码与货架条：库位与 SKU',
    lede: '宽条货架签、50×30 条码贴，绑定库位与 SKU 列批量打印。',
    img: '/marketing/sample-price-tag.jpg',
    imgAlt: '货架价签样例',
    templateQuery: 'retail-shelf',
    faq: [{ q: '条码格式？', a: '支持常见一维码与二维码，绑定数据列即可。' }]
  },
  '/use-cases/clothing-hangtag': {
    h1: '服装吊牌打印：款号、尺码与吊牌价',
    lede: '套用服装吊牌模板，导入款号、颜色、尺码与价格列，批量打印吊牌。',
    img: '/marketing/sample-apparel-tag.webp',
    imgAlt: '服装吊牌样例',
    templateQuery: 'apparel',
    faq: [{ q: '能拼版多枚一页吗？', a: '可以。纸张设置里配置 A4 拼版行列与间距。' }]
  }
}

const HELP_TOPICS = {
  '/help/excel-import': {
    h1: '如何导入 Excel 或 CSV 批量打标签',
    lede: '首行为字段名；支持追加、按主键更新或整表替换。无需上传到签立方服务器。',
    body: `<p>在工作台或底部数据面板点「导入」，选择 .xlsx / .csv。已有数据时可：</p>
      <ul class="seo-list"><li><strong>追加</strong> — 按列名合并新行</li>
      <li><strong>按主键更新</strong> — 条码/SKU 不变只改价格等</li>
      <li><strong>替换</strong> — 清空当前表（不可撤销）</li></ul>
      <p>导入后若模板字段与表头不一致，用工具栏「字段映射」对齐，或见 <a href="/help">完整帮助</a>。</p>`
  },
  '/help/barcodes': {
    h1: '条形码与二维码：绑定数据列并打印',
    lede: '画布插入条码/二维码组件，绑定列后预览与 PDF 一并输出；免费条码打印，无需插件。',
    body: `<p>在组件面板放入条形码或二维码，在属性里选择数据列。打印、PNG 与矢量 PDF 与画布预览一致。</p>
      <p>价签、资产贴、货架签等模板已预留条码位，套用后在映射里对齐「条码」「SKU」等列即可。</p>`
  },
  '/help/ai-layout': {
    h1: 'AI 排版：默认可免费使用',
    lede: '描述想要的价签样式或让 AI 调整布局；默认走站内内置模型，不用填 API 密钥。不用 AI 时数据不发送。',
    body: `<p>左侧「AI 调整」可文字说明改字号、加价格字段等。内置模型有免费额度；若要更强模型或图片纠偏，再在 AI 设置填自己的 Key，请求由浏览器直连模型服务商。</p>
      <p>无密钥时，手动排版、导入、打印与 PDF 导出仍全部可用。</p>`
  },
  '/help/pdf-export': {
    h1: '导出 PDF 与打印：与画布预览一致',
    lede: '预览内可导出矢量 PDF 或 PNG；中文嵌入字体，拉丁字色与画布一致（含红色价格）。',
    body: `<p>点「预览」查看按行拼版，再导出 PDF/PNG 或浏览器打印。热敏 TSPL/ZPL 指令可在打印设置里生成。</p>
      <p>输出路径与画布、预览共用同一渲染引擎，避免版式跑偏。</p>`
  },
  '/help/local-storage': {
    h1: '本地保存：无登录，数据留在浏览器',
    lede: '项目列表与表格写在 localStorage 与 IndexedDB；不用注册，签立方不上传你的表格到自有服务器。',
    body: `<p>左侧项目栏可新建、切换、导出 JSON 备份。切换项目前会自动把当前表格写回该项目。</p>
      <p>清除浏览器数据会删除本地项目；重要表格请自行导出 Excel 或项目 JSON。详见 <a href="/privacy">隐私说明</a>。</p>`
  },
  '/help/field-mapping': {
    h1: '字段映射：让表头与版式字段对齐',
    lede: '模板里的 {{字段}} 与组件绑定列需与 Excel 首行表头一致；映射可手动调整并在相同表头再次导入时恢复。',
    body: `<p>导入后若提示缺列，点工具栏「字段映射」把标签字段拖到表头列。版式占位符支持轻量表达式，见工作台属性面板说明。</p>
      <p>导入确认框勾选「用上次映射」可在列名不变时跳过重复对齐。数据面板改单元格会实时写回当前项目。</p>`
  },
  '/help/preflight': {
    h1: '打印前体检：缺字段与场景行检查',
    lede: '点打印、导出 PDF/PNG 前会自动体检。阻塞项需先修复；提示级问题可仍继续。',
    body: `<p>通用检查包括：绑定列为空、标签超出纸张、图片 URL 无效等。价签场景会额外检查空价格、缺条码；面单场景检查手机号。</p>
      <p>体检结果可一键跳到字段映射、导入或选中问题组件。仅提示时仍可继续打印。</p>`
  },
  '/help/paper-layout': {
    h1: '纸张尺寸与 A4 拼版',
    lede: '按毫米设置单张标签纸或 A4 上多枚拼版；「打印排版」调行列与间距。',
    body: `<p>工具栏「纸张」设置标签宽高、边距与 DPI；单张标签纸请让标签尺寸等于纸张尺寸，避免偏移裁切。</p>
      <p>「打印排版」配置一页几行几列；预览顶栏按展开份数统计张数，与真实打印一致。热敏纸类型（间隙/黑标/连续）在打印设置里选择。</p>`
  }
}

function useCaseBody(path) {
  const cfg = USE_CASES[path]
  if (!cfg) return ''
  const img =
    cfg.img ?
      `<figure class="seo-figure"><img src="${cfg.img}" alt="${escapeHtml(cfg.imgAlt)}" width="800" height="530" loading="lazy" /></figure>`
    : ''
  return docBody({
    h1: cfg.h1,
    lede: cfg.lede,
    links: [
      { href: `/templates?scene=${cfg.templateQuery}`, label: '打开相关模板' },
      { href: '/help/excel-import', label: '导入 Excel' },
      { href: '/app', label: '工作台' }
    ],
    sections: [
      {
        h2: '怎么做',
        html: `<ol class="seo-steps"><li>在 <a href="/templates?scene=${cfg.templateQuery}">模板库</a> 选模板并套用。</li><li>导入 Excel，按行绑定字段与条码。</li><li>预览后批量打印或 <a href="/help/pdf-export">导出 PDF</a>。</li></ol>${img}`
      }
    ],
    faq: cfg.faq
  })
}

function helpTopicBody(path) {
  const cfg = HELP_TOPICS[path]
  if (!cfg) return ''
  const short = path.replace('/help/', '')
  const titleMap = {
    'excel-import': '导入 Excel',
    barcodes: '条形码',
    'ai-layout': 'AI 排版',
    'pdf-export': 'PDF 导出',
    'local-storage': '本地保存',
    'field-mapping': '字段映射',
    preflight: '打印前体检',
    'paper-layout': '纸张与拼版'
  }
  return docBody({
    h1: cfg.h1,
    lede: cfg.lede,
    breadcrumbs: [
      { label: '首页', href: '/' },
      { label: '帮助', href: '/help' },
      { label: titleMap[short] || cfg.h1 }
    ],
    links: [
      { href: '/help', label: '帮助首页' },
      { href: '/templates', label: '模板库' }
    ],
    sections: [{ h2: '说明', html: cfg.body }]
  })
}

function privacyBody() {
  return docBody({
    h1: '签立方隐私与数据说明',
    lede: '签立方无需注册。默认情况下，你的表格与项目只保存在本机浏览器；我们不运营云端账号库。',
    links: [{ href: '/', label: '首页' }, { href: '/help/local-storage', label: '本地保存' }],
    sections: [
      {
        h2: '我们收集什么',
        html: `<p>正常使用设计器时，业务数据（Excel 行、项目 JSON）留在你的浏览器本地存储（localStorage / IndexedDB），不经过签立方自有后端。</p>
          <p>若你主动启用 AI 排版并填写 API Key，浏览器会向你选择的模型服务商发起请求，适用该服务商的隐私政策。</p>`
      },
      {
        h2: '托管与日志',
        html: `<p>站点静态资源托管在 EdgeOne（ci64.com）。一般的 CDN 访问日志由托管方按行业惯例保留，签立方不以此构建用户档案。</p>`
      },
      {
        h2: '产品区分',
        html: `<p>${escapeHtml(ORGANIZATION_DISAMBIGUATION)}</p>`
      }
    ]
  })
}

function englishFaqSection(faqs) {
  const items = faqs
    .map(
      (f) =>
        `<details class="seo-faq-item"><summary><h3>${escapeHtml(f.q)}</h3></summary><p>${escapeHtml(f.a)}</p></details>`
    )
    .join('\n')
  return `<section class="seo-block" id="seo-faq"><h2>FAQ</h2>${items}</section>`
}

function englishHomeBody() {
  const scenes = [
    ['Price tags', 'Name, spec, price, barcode — retail &amp; grocery.', '/use-cases/price-tag'],
    ['Shipping labels', 'Recipient, phone, address, tracking QR.', '/use-cases/shipping-label'],
    ['Asset tags', 'Asset ID, department, barcode for inventory.', '/use-cases/asset-tag'],
    ['Shelf strips', 'Wide shelf labels with location and price.', '/use-cases/shelf-barcode'],
    ['Apparel hang tags', 'Style, size, color, price.', '/use-cases/clothing-hangtag'],
    ['Template scenes (中文)', 'Dedicated pages for retail, express, asset &amp; more.', '/templates/retail-price']
  ]
  const sceneHtml = scenes
    .map(([name, desc, href]) => `<li><strong>${name}</strong> — ${desc} <a href="${href}">Details</a></li>`)
    .join('')

  return `
  <article id="seo-static-main" class="seo-static-main" lang="en">
    <header class="seo-hero">
      <p class="seo-kicker">Label Cube · 签立方 — browser-native label printer</p>
      <h1>LabelCube: free online label design and batch printing from Excel</h1>
      <p class="seo-lede">LabelCube (签立方) runs entirely in your browser at ci64.com. Design millimeter-accurate labels, import Excel or CSV row-by-row, preview imposition, print or export vector PDF/PNG. Built-in barcodes and QR codes, column-based copy counts, optional free AI layout, and local-only project storage—no account and no upload of your spreadsheet to LabelCube servers.</p>
      <nav class="seo-actions" aria-label="Quick links">
        <a href="/app">Open editor</a>
        <a href="/templates">Template library (中文)</a>
        <a href="/help">Help (中文)</a>
        <a href="/">中文首页</a>
      </nav>
    </header>
    <section class="seo-block"><h2>Quick steps</h2>
      <ol class="seo-steps">
        <li>Choose a template at <a href="/templates">/templates</a> (UI in Chinese) and apply it with sample data.</li>
        <li>Import your file; use <a href="/help/field-mapping">field mapping</a> if headers differ.</li>
        <li>Run <a href="/help/preflight">preflight</a>, preview, then print or <a href="/help/pdf-export">export PDF</a>. Data stays in localStorage/IndexedDB on this device.</li>
      </ol>
    </section>
    <section class="seo-block"><h2>What is included</h2>
      <ul class="seo-list">
        <li>Barcodes, QR codes, text expressions, image columns (URL or Base64)</li>
        <li>A4 imposition and TSPL/ZPL for industrial printers</li>
        <li>Print queue/history; PDF colors match canvas preview (e.g. red price text)</li>
        <li>Optional AI layout with built-in model—no API key required for default use</li>
      </ul>
    </section>
    <section class="seo-block"><h2>Common scenarios</h2><ul class="seo-list">${sceneHtml}</ul></section>
  <section class="seo-block"><h2>Privacy &amp; disambiguation</h2>
    <p class="seo-note">${escapeHtml(ORGANIZATION_DISAMBIGUATION)} This site ci64.com is the Label Cube product, not the X-Rite Ci64 colorimeter.</p>
    <p>See <a href="/privacy">privacy (中文)</a> and <a href="/help/local-storage">local storage help</a>.</p>
  </section>
    ${englishFaqSection(EN_HOME_FAQ)}
  </article>
  ${PRODUCT_JPGS}`
}

/** @type {Record<string, { bodyHtml: string, jsonLd: object[] }>} */
const ROUTE_BODY_BUILDERS = {
  '/': () => ({ bodyHtml: homeBody(), jsonLd: jsonLdHome() }),
  '/templates': () => ({ bodyHtml: templatesBody(), jsonLd: jsonLdTemplates() }),
  '/help': () => ({ bodyHtml: helpBody(), jsonLd: jsonLdHelp() }),
  '/privacy': () => ({ bodyHtml: privacyBody(), jsonLd: jsonLdPrivacy() }),
  '/en': () => ({ bodyHtml: englishHomeBody(), jsonLd: jsonLdEnglish() }),
  '/app': () => ({
    bodyHtml: `<article id="seo-static-main" class="seo-static-main" lang="zh-CN"><h1>签立方标签设计与打印工作台</h1><p class="seo-lede">请开启 JavaScript 使用完整编辑器。<a href="/">返回首页</a> · <a href="/templates">模板库</a></p></article>`,
    jsonLd: []
  })
}

for (const path of Object.keys(USE_CASES)) {
  ROUTE_BODY_BUILDERS[path] = () => ({ bodyHtml: useCaseBody(path), jsonLd: jsonLdUseCase(path) })
}
for (const path of Object.keys(HELP_TOPICS)) {
  ROUTE_BODY_BUILDERS[path] = () => ({ bodyHtml: helpTopicBody(path), jsonLd: jsonLdHelpTopic(path) })
}

function orgLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '签立方',
    alternateName: ['Label Cube', 'LabelPrinter', '签立方 Label Cube'],
    url: OFFICIAL_SITE_URL,
    logo: `${OFFICIAL_SITE_ORIGIN}/marketing/hero-app-editor.jpg`,
    description: ORGANIZATION_DISAMBIGUATION,
    sameAs: [OFFICIAL_SITE_URL, REPO_URL]
  }
}

function faqLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  }
}

function jsonLdHome() {
  const meta = ROUTE_SITE_META['/']
  return [
    orgLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '签立方',
      alternateName: ['Label Cube', 'LabelCube', 'LabelPrinter'],
      url: OFFICIAL_SITE_URL,
      image: `${OFFICIAL_SITE_ORIGIN}/marketing/hero-app-editor.jpg`,
      description: meta.description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: ['zh-CN', 'en'],
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
      publisher: { '@type': 'Organization', name: '签立方' },
      featureList: [
        'AI 排版与按说明调整',
        'Excel/CSV 批量填充',
        '条形码与二维码',
        '毫米级纸张与拼版',
        '矢量 PDF 与 PNG 导出',
        '浏览器本地保存'
      ]
    },
    faqLd(HOME_FAQ)
  ]
}

function jsonLdTemplates() {
  const catalog = getTemplateCatalog()
  return [
    orgLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: '签立方内置模板',
      itemListElement: catalog.slice(0, 24).map((row, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: row.name,
        description: `${row.size} mm — ${row.desc || ''}`
      }))
    }
  ]
}

function jsonLdHelp() {
  return [
    orgLd(),
    faqLd(HOME_FAQ.slice(0, 5)),
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: '用 Excel 批量打印价签',
      step: [
        { '@type': 'HowToStep', name: '选择模板', text: '在模板库选价签或条码模板并套用。' },
        { '@type': 'HowToStep', name: '导入 Excel', text: '导入表格并映射字段到标签组件。' },
        { '@type': 'HowToStep', name: '打印或导出', text: '预览后浏览器打印或导出 PDF。' }
      ]
    }
  ]
}

function jsonLdPrivacy() {
  return [orgLd()]
}

function jsonLdEnglish() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'LabelCube',
      alternateName: ['签立方', 'Label Cube'],
      url: `${OFFICIAL_SITE_ORIGIN}/en`,
      inLanguage: 'en',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Excel/CSV batch fill',
        'Barcodes and QR codes',
        'Millimeter paper and imposition',
        'Vector PDF export',
        'Local browser storage',
        'Optional AI layout'
      ]
    },
    faqLd(EN_HOME_FAQ)
  ]
}

function jsonLdUseCase(path) {
  const cfg = USE_CASES[path]
  if (!cfg) return [orgLd()]
  return [orgLd(), faqLd(cfg.faq || [])]
}

function jsonLdHelpTopic(path) {
  const cfg = HELP_TOPICS[path]
  if (!cfg) return [orgLd()]
  return [
    orgLd(),
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: cfg.h1,
        acceptedAnswer: { '@type': 'Answer', text: cfg.lede }
      }
    ]
  }
  ]
}

/** 参与 prerender 的路由（含首页，构建时覆盖 dist/index.html 正文区） */
const TEMPLATE_SCENE_PATHS = TEMPLATE_SCENE_SLUGS.map((slug) => `/templates/${slug}`)

export const PRERENDER_PATHS = [
  '/',
  '/en',
  '/templates',
  '/help',
  '/privacy',
  '/app',
  ...TEMPLATE_SCENE_PATHS,
  ...Object.keys(USE_CASES),
  ...Object.keys(HELP_TOPICS)
]

export const SITEMAP_PATHS = [
  '/',
  '/en',
  '/templates',
  '/help',
  '/privacy',
  ...TEMPLATE_SCENE_PATHS,
  ...Object.keys(USE_CASES),
  ...Object.keys(HELP_TOPICS)
]

/**
 * @param {string} routePath
 */
export function getSeoRoutePayload(routePath) {
  const sceneSlug = parseTemplateSceneSlug(routePath)
  if (sceneSlug) {
    return { bodyHtml: renderTemplateSceneBodyHtml(sceneSlug), jsonLd: jsonLdTemplateScene(sceneSlug) }
  }
  const builder = ROUTE_BODY_BUILDERS[routePath]
  if (!builder) return null
  return builder()
}

/**
 * @param {string} routePath
 */
export function renderStaticBodyHtml(routePath) {
  const payload = getSeoRoutePayload(routePath)
  return payload?.bodyHtml ?? ''
}

/**
 * @param {object[]} blocks
 */
export function serializeJsonLdScripts(blocks) {
  return blocks
    .map((data) => `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`)
    .join('\n  ')
}