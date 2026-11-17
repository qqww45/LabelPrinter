/**
 * After `vite build`, write route-specific index.html under dist/{templates,help}/
 * so crawlers that fetch first HTML without executing JS get unique title/description.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTE_SITE_META, canonicalUrlForPath } from '../src/utils/siteMeta.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = path.join(root, 'dist', 'index.html')

if (!fs.existsSync(distIndex)) {
  console.error('prerender-route-html: dist/index.html not found — run vite build first')
  process.exit(1)
}

const baseHtml = fs.readFileSync(distIndex, 'utf8')

/** @param {string} html */
/** @param {{ title: string, description: string, canonical: string }} meta */
function patchHead(html, meta) {
  let out = html
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
  out = out.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${meta.description}" />`
  )
  out = out.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${meta.title}" />`
  )
  out = out.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${meta.description}" />`
  )
  out = out.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${meta.canonical}" />`
  )
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${meta.title}" />`
  )
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${meta.description}" />`
  )
  out = out.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${meta.canonical}" />`
  )
  return out
}

for (const routePath of ['/templates', '/help']) {
  const meta = ROUTE_SITE_META[routePath]
  const patched = patchHead(baseHtml, {
    title: meta.title,
    description: meta.description,
    canonical: canonicalUrlForPath(routePath)
  })
  const dir = path.join(root, 'dist', routePath.slice(1))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), patched, 'utf8')
}

console.log('prerender-route-html: wrote dist/templates/index.html, dist/help/index.html')