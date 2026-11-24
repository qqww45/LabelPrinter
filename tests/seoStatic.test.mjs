import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PRERENDER_PATHS,
  SITEMAP_PATHS,
  renderStaticBodyHtml,
  getSeoRoutePayload
} from '../src/content/seoStatic.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const h1s = new Map()
for (const routePath of PRERENDER_PATHS) {
  const html = renderStaticBodyHtml(routePath)
  assert(html.includes('<h1'), `${routePath} missing h1`)
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)]
  assert(h1Matches.length === 1, `${routePath} exactly one h1 in static body`)
  const h1 = h1Matches[0][1].replace(/<[^>]+>/g, '').trim()
  assert(h1, `${routePath} empty h1`)
  h1s.set(routePath, h1)
  const payload = getSeoRoutePayload(routePath)
  if (routePath !== '/app') assert(payload?.jsonLd?.length, `${routePath} needs jsonLd`)
  if (routePath === '/') {
    assert(html.includes('常见问题'), 'home FAQ visible')
    assert(html.includes('<details'), 'home FAQ in HTML')
  }
  if (routePath === '/templates') {
    assert(h1 !== h1s.get('/'), 'templates must differ from home h1')
    assert(html.includes('模板'), 'templates body')
  }
}

assert(h1s.get('/templates') !== h1s.get('/help'), 'templates vs help h1')
assert(h1s.get('/') !== h1s.get('/help'), 'home vs help h1')

const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
assert(idx.includes('SEO_BODY_START'), 'index markers')
assert(idx.includes('SEO_JSONLD_START'), 'jsonld markers')

assert(SITEMAP_PATHS.every((p) => PRERENDER_PATHS.includes(p) || p === '/'), 'sitemap subset of prerender')

console.log('seoStatic ok')