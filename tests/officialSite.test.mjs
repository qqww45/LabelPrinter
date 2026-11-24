import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  OFFICIAL_SITE_ORIGIN,
  OFFICIAL_SITE_URL,
  STALE_OFFICIAL_HOST
} from '../src/utils/site.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const SCAN_EXT = new Set([
  '.md', '.html', '.txt', '.xml', '.json', '.js', '.mjs', '.vue', '.yml', '.yaml', '.conf', '.example'
])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'package-lock.json'])

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      walk(full, out)
      continue
    }
    const ext = path.extname(name)
    if (!SCAN_EXT.has(ext)) continue
    const rel = path.relative(root, full)
    if (rel === 'tests/officialSite.test.mjs') continue
    if (rel === 'src/utils/site.js') continue
    out.push(full)
  }
  return out
}

let staleHits = []
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes(STALE_OFFICIAL_HOST)) {
    staleHits.push(path.relative(root, file))
  }
}
assert(staleHits.length === 0, `stale official host still present: ${staleHits.join(', ')}`)

const mustUseOfficial = [
  'README.md',
  'index.html',
  'public/llms.txt',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/sitemap-images.xml'
]
for (const rel of mustUseOfficial) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8')
  assert(text.includes(OFFICIAL_SITE_ORIGIN), `${rel} must mention ${OFFICIAL_SITE_ORIGIN}`)
  assert(!text.includes(STALE_OFFICIAL_HOST), `${rel} must not mention ${STALE_OFFICIAL_HOST}`)
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
assert(indexHtml.includes(`href="${OFFICIAL_SITE_URL}"`), 'canonical must use trailing-slash official URL')
assert(indexHtml.includes(`"url": "${OFFICIAL_SITE_URL}"`), 'JSON-LD url must match official site')
assert(
  indexHtml.includes(`${OFFICIAL_SITE_ORIGIN}/marketing/hero-app-editor.jpg`),
  'index.html must include absolute og:image JPG URL'
)
assert(indexHtml.includes('og:image:type" content="image/jpeg"'), 'og:image:type must be jpeg')
assert(indexHtml.includes('id="seo-product-shots"'), 'index.html must include static crawler-visible images')
assert(
  indexHtml.includes('src="/marketing/hero-app-editor.jpg"'),
  'static img must point at marketing JPG'
)
assert(
  indexHtml.includes('"@type": "Organization"') || indexHtml.includes('"image": "https://ci64.com/marketing/hero-app-editor.jpg"'),
  'JSON-LD Organization or image'
)
assert(fs.existsSync(path.join(root, 'public/favicon.ico')), 'public/favicon.ico must exist')
assert(fs.existsSync(path.join(root, 'public/ai.txt')), 'public/ai.txt must exist')
assert(fs.existsSync(path.join(root, 'public/404.html')), 'public/404.html must exist')
assert(indexHtml.includes('SEO_BODY_START'), 'index.html prerender body markers')
assert(indexHtml.includes('hreflang="zh-CN"'), 'hreflang zh-CN on home shell')
assert(!indexHtml.includes('<h1 class="boot-title"'), 'boot brand must not be h1')
assert(indexHtml.includes('class="boot-title"'), 'boot brand marker')
const edgeone = JSON.parse(fs.readFileSync(path.join(root, 'edgeone.json'), 'utf8'))
assert(edgeone.errorPage === '404.html', 'edgeone uses 404.html')
assert(!edgeone.rewrites?.some((r) => r.source === '/*'), 'no catch-all soft 404 rewrite')
assert(edgeone.framework === undefined, 'omit framework:vite so Makers serves MPA + 404.html instead of SPA fallback')
assert(
  edgeone.redirects?.some((r) => r.source === '/index.html' && r.destination === '/' && r.statusCode === 301),
  '301 /index.html → /'
)
assert(
  edgeone.redirects?.some((r) => r.source === '/en/' && r.destination === '/en' && r.statusCode === 301),
  '301 /en/ → /en'
)
const page404 = fs.readFileSync(path.join(root, 'public/404.html'), 'utf8')
assert(page404.includes('noindex,nofollow'), '404.html robots noindex')
assert(!page404.includes('rel="canonical"'), '404.html must not set canonical')
assert(page404.includes('/templates'), '404.html nav')
const favIcon = fs.readFileSync(path.join(root, 'public/favicon.ico'))
assert(favIcon[0] === 0 && favIcon.length > 20, 'favicon.ico must be a real icon file')
const robots = fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf8')
assert(robots.includes('sitemap-images.xml'), 'robots must reference image sitemap')
const imgSitemap = fs.readFileSync(path.join(root, 'public/sitemap-images.xml'), 'utf8')
assert(imgSitemap.includes('xmlns:image='), 'image sitemap must declare image namespace')
assert(
  imgSitemap.includes(`${OFFICIAL_SITE_ORIGIN}/marketing/sample-price-tag.jpg`),
  'image sitemap must list product JPGs'
)

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
assert(pkg.homepage === OFFICIAL_SITE_URL, 'package.json homepage must match official site')

import { SITEMAP_PATHS, SITEMAP_ENTRIES } from '../src/content/seoStatic.js'

for (const p of SITEMAP_PATHS) {
  assert(SITEMAP_ENTRIES[p], `SITEMAP_ENTRIES missing ${p}`)
}

const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])
const distinctLastmod = new Set(lastmods)
assert(distinctLastmod.size >= 3, 'sitemap lastmod should vary per URL, not one build stamp for all')
for (const p of SITEMAP_PATHS) {
  const loc = p === '/' ? `${OFFICIAL_SITE_URL}` : `${OFFICIAL_SITE_ORIGIN}${p}`
  const block = sitemap.split('<url>').find((chunk) => chunk.includes(`<loc>${loc}</loc>`))
  assert(block?.includes(`<lastmod>${SITEMAP_ENTRIES[p].lastmod}</lastmod>`), `${p} sitemap lastmod`)
}
const expectedLocs = SITEMAP_PATHS.map(p =>
  p === '/' ? `${OFFICIAL_SITE_ORIGIN}/` : `${OFFICIAL_SITE_ORIGIN}${p}`
)
assert(
  expectedLocs.every(loc => sitemapLocs.includes(loc)),
  `sitemap.xml must list marketing routes: missing ${expectedLocs.filter(l => !sitemapLocs.includes(l)).join(', ')}`
)
assert(
  !sitemapLocs.some(loc => loc.endsWith('/app')),
  'sitemap.xml must not list /app (editor is noindex)'
)
assert(
  sitemapLocs.every(loc => loc.startsWith(OFFICIAL_SITE_ORIGIN)),
  'sitemap.xml locs must use official origin only'
)

console.log('officialSite ok')
