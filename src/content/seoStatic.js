/**
 * 无 JS 首屏与 prerender 正文、JSON-LD 单一来源。
 * 构建后 scripts/prerender-route-html.mjs 写入各路由 index.html。
 */
import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL, REPO_URL } from '../utils/site.js'
import { ROUTE_SITE_META } from '../utils/siteMeta.js'
import { getTemplateCatalog } from '../utils/templatesCatalog.js'
import { SCENE_PACKS } from '../utils/scenePacks.js'
import { HOME_FAQ, ORGANIZATION_DISAMBIGUATION } from './seoFaq.js'

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
  '/templates': { lastmod: '2026-11-23', changefreq: 'weekly', priority: '0.9' },
  '/help': { lastmod: '2026-11-23', changefreq: 'monthly', priority: '0.8' },
  '/help/excel-import': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/barcodes': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/ai-layout': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/pdf-export': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/help/local-storage': { lastmod: '2026-11-20', changefreq: 'monthly', priority: '0.72' },
  '/privacy': { lastmod: '2026-11-18', changefreq: 'yearly', priority: '0.5' },
  '/use-cases/price-tag': { lastmod: '2026-11-22', changefreq: 'monthly', priority: '0.78' },
  '/use-cases/shipping-label': { lastmod: '2026-11-22', changefreq: 'monthly', priority: '0.78' },
  '/use-cases/asset-tag': { lastmod: '2026-11-22', changefreq: 'monthly', priority: '0.78' },
  '/use-cases/shelf-barcode': { lastmod: '2026-11-22', changefreq: 'monthly', priority: '0.78' },
  '/use-cases/clothing-hangtag': { lastmod: '2026-11-22', changefreq: 'monthly', priority: '0.78' }
}

/** @param {string} s */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const PRODUCT_JPGS = `
  <section id="seo-product-shots" aria-label="签立方产品与标签打印样例">
    <img src="/marketing/hero-app-editor.jpg" width="1200" height="750" alt="签立方在线标签设计工作台界面：画布、组件栏与数据表批量打印" />
    <img src="/marketing/sample-price-tag.jpg" width="800" height="530" alt="签立方价签打印预览：品名、规格、价格与条码" />
    <img src="/marketing/sample-waybill.jpg" width="800" height="530" alt="签立方快递面单打印预览：收件信息与运单二维码" />
    <img src="/marketing/hero-label-stickers.jpg" width="1200" height="320" alt="签立方多种价签、条码与吊牌模板画布预览标本" />
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
    ['价签 / 产品标签', '品名、规格、价格与条码，适合超市与门店。', '/use-cases/price-tag', '价签场景说明'],
    ['快递面单', '收件人、电话、地址与运单二维码。', '/use-cases/shipping-label', '面单场景说明'],
    ['资产标签', '资产编号、部门与条码，方便盘点。', '/use-cases/asset-tag', '资产贴场景'],
    ['货架签 / 吊牌', '宽条价签与服装吊牌拼版打印。', '/use-cases/shelf-barcode', '货架条码场景'],
    ['服装吊牌', '款号、尺码、颜色与吊牌价。', '/use-cases/clothing-hangtag', '服装吊牌场景']
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
      <p class="seo-lede">在浏览器里设计标签，导入 Excel 或 CSV，批量预览、打印或导出 PDF。默认可免费 AI 排版，不用注册；数据留在本机浏览器。</p>
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
        <li>毫米级纸张与 A4 拼版；条形码、二维码绑定数据列</li>
        <li>文本表达式、按列份数、打印前体检</li>
        <li><a href="/help/ai-layout">免费 AI 排版</a>（默认内置模型，可选自备密钥）</li>
        <li><a href="/help/local-storage">本地保存</a>：项目与表格留在浏览器，无需账号</li>
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
  const sceneLinks = SCENE_PACKS.map(
    (p) => `<li><a href="/templates?scene=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a> — ${escapeHtml(p.blurb)}</li>`
  ).join('')

  return `
  <article id="seo-static-main" class="seo-static-main" lang="zh-CN">
    <header class="seo-hero">
      <h1>签立方模板库：免费价签、条码、面单与资产贴模板</h1>
      <p class="seo-lede">按行业与纸型浏览内置模板，查看尺寸与字段说明，一键套用进工作台后导入 Excel 按行打印。</p>
      <nav class="seo-actions"><a href="/app">打开工作台</a><a href="/">返回首页</a><a href="/help">帮助</a></nav>
    </header>
    <section class="seo-block"><h2>按场景浏览</h2><ul class="seo-list">${sceneLinks}</ul></section>
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
    ['条形码与二维码', '/help/barcodes', '绑定列与打印输出'],
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
      <p class="seo-lede">签立方把表格每一行印成一张标签。下列专题解答导入、条码、AI 排版、PDF 与本地数据；完整手册可在工作台内打开帮助页交互浏览。</p>
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

/** @param {{ h1: string, lede: string, sections: {h2:string, html:string}[], faq?: typeof HOME_FAQ, links?: {href:string,label:string}[] }} cfg */
function docBody(cfg) {
  const secs = cfg.sections
    .map((s) => `<section class="seo-block"><h2>${escapeHtml(s.h2)}</h2>${s.html}</section>`)
    .join('')
  const nav = (cfg.links || [])
    .map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`)
    .join(' · ')
  const faq = cfg.faq?.length ? faqSection(cfg.faq) : ''
  return `
  <article id="seo-static-main" class="seo-static-main" lang="zh-CN">
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
    lede: '导入品名、规格、价格与条码列，套用价签模板后批量打印或导出 PDF。免费在线，无需注册。',
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
    lede: '按行打印收件人、电话、地址与运单二维码；适合电商发货表批量出面单。',
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
  return docBody({
    h1: cfg.h1,
    lede: cfg.lede,
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

function englishHomeBody() {
  return `
  <article id="seo-static-main" class="seo-static-main" lang="en">
    <header class="seo-hero">
      <p class="seo-kicker">Free online label printing</p>
      <h1>LabelCube: batch-print price tags, barcodes &amp; shipping labels from Excel</h1>
      <p class="seo-lede">Design labels in the browser, import Excel/CSV, preview, print or export PDF. Optional free AI layout. No signup; data stays on your device.</p>
      <nav class="seo-actions">
        <a href="/templates">Templates (中文)</a>
        <a href="/app">Open editor</a>
        <a href="/">中文首页</a>
      </nav>
    </header>
    <section class="seo-block"><h2>Quick steps</h2>
      <ol class="seo-steps">
        <li>Pick a template from the library.</li>
        <li>Import a spreadsheet; bind columns to fields.</li>
        <li>Batch print or export PDF.</li>
      </ol>
    </section>
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
      url: `${OFFICIAL_SITE_ORIGIN}/en`,
      inLanguage: 'en',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    }
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
export const PRERENDER_PATHS = [
  '/',
  '/en',
  '/templates',
  '/help',
  '/privacy',
  '/app',
  ...Object.keys(USE_CASES),
  ...Object.keys(HELP_TOPICS)
]

export const SITEMAP_PATHS = [
  '/',
  '/en',
  '/templates',
  '/help',
  '/privacy',
  ...Object.keys(USE_CASES),
  ...Object.keys(HELP_TOPICS)
]

/**
 * @param {string} routePath
 */
export function getSeoRoutePayload(routePath) {
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