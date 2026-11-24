import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRERENDER_PATHS } from '../src/content/seoStatic.js'
import { ROUTE_SITE_META } from '../src/utils/siteMeta.js'
import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL } from '../src/utils/site.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

if (!fs.existsSync(dist)) {
  console.log('seoPrerender skip (no dist — run npm run build first)')
  process.exit(0)
}

function distFile(routePath) {
  if (routePath === '/') return path.join(dist, 'index.html')
  const parts = routePath.split('/').filter(Boolean)
  return path.join(dist, ...parts, 'index.html')
}

function countH1(html) {
  return [...html.matchAll(/<h1[\s>]/gi)].length
}

function hreflangTags(html) {
  return [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({
    hreflang: m[1],
    href: m[2]
  }))
}

const bodies = new Set()
for (const routePath of PRERENDER_PATHS) {
  const file = distFile(routePath)
  assert(fs.existsSync(file), `missing ${file}`)
  const html = fs.readFileSync(file, 'utf8')
  const meta = ROUTE_SITE_META[routePath] ?? ROUTE_SITE_META['/']
  assert(html.includes(`<title>${meta.title}</title>`), `${routePath} title`)
  assert(html.includes(`content="${meta.description}"`), `${routePath} description`)
  assert(countH1(html) === 1, `${routePath} must have exactly one h1`)

  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  const h1 = m ? m[1].replace(/<[^>]+>/g, '').trim() : ''
  bodies.add(`${routePath}::${h1}`)

  const langs = hreflangTags(html)
  if (routePath === '/' || routePath === '/en') {
    assert(langs.length === 3, `${routePath} hreflang trio`)
    assert(langs.some((t) => t.hreflang === 'zh-CN' && t.href === OFFICIAL_SITE_URL), `${routePath} zh-CN`)
    assert(langs.some((t) => t.hreflang === 'en' && t.href === `${OFFICIAL_SITE_ORIGIN}/en`), `${routePath} en`)
    assert(langs.some((t) => t.hreflang === 'x-default' && t.href === OFFICIAL_SITE_URL), `${routePath} x-default`)
  } else {
    assert(langs.length === 0, `${routePath} must not declare hreflang`)
  }

  if (routePath === '/app') {
    assert(html.includes('content="noindex,follow"'), '/app robots')
    assert(!html.includes('rel="canonical"'), '/app no canonical')
  } else if (routePath !== '/') {
    assert(html.includes('rel="canonical"'), `${routePath} canonical`)
  }

  if (routePath === '/templates') {
    assert(html.includes('内置模板') || html.includes('模板'), 'templates distinct body')
  }
}

assert(bodies.size >= 3, 'distinct h1 across routes')

assert(fs.existsSync(path.join(dist, '404.html')), 'dist/404.html for EdgeOne errorPage')
assert(
  !fs.existsSync(path.join(dist, 'no-such-page-test', 'index.html')),
  'unknown paths must not be prerendered as index.html'
)
const ghost = fs.readFileSync(path.join(dist, '404.html'), 'utf8')
assert(ghost.includes('noindex'), '404 dist noindex')

const blog = path.join(dist, 'blog', 'index.html')
assert(!fs.existsSync(blog), 'blog should not be prerendered')

const aiTxt = path.join(dist, 'ai.txt')
assert(fs.existsSync(aiTxt), 'ai.txt static')
assert(fs.readFileSync(aiTxt, 'utf8').startsWith('#'), 'ai.txt plain text')

console.log('seoPrerender ok')