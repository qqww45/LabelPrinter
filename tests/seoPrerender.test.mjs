import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRERENDER_PATHS } from '../src/content/seoStatic.js'
import { ROUTE_SITE_META } from '../src/utils/siteMeta.js'

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

const bodies = new Set()
for (const routePath of PRERENDER_PATHS) {
  const file = distFile(routePath)
  assert(fs.existsSync(file), `missing ${file}`)
  const html = fs.readFileSync(file, 'utf8')
  const meta = ROUTE_SITE_META[routePath] ?? ROUTE_SITE_META['/']
  assert(html.includes(`<title>${meta.title}</title>`), `${routePath} title`)
  assert(html.includes(`content="${meta.description}"`), `${routePath} description`)
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  const h1 = m ? m[1].replace(/<[^>]+>/g, '').trim() : ''
  bodies.add(`${routePath}::${h1}`)
  if (routePath === '/templates') {
    assert(html.includes('内置模板') || html.includes('模板'), 'templates distinct body')
  }
}

assert(bodies.size >= 3, 'distinct h1 across routes')

const blog = path.join(dist, 'blog', 'index.html')
assert(!fs.existsSync(blog), 'blog should not be prerendered')

const aiTxt = path.join(dist, 'ai.txt')
assert(fs.existsSync(aiTxt), 'ai.txt static')
assert(fs.readFileSync(aiTxt, 'utf8').startsWith('#'), 'ai.txt plain text')

console.log('seoPrerender ok')