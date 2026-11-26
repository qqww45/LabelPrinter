import {
  buildEdgeOneRoutes,
  buildSceneQueryRedirectRoutes,
  buildTrailingSlashStripRoutes,
  buildPrefixChild404Routes,
  FILE_404_RESPONSE
} from '../src/utils/edgeoneRoutePlan.js'
import { PRERENDER_PATHS } from '../src/content/seoStatic.js'
import { TEMPLATE_SCENE_SLUGS } from '../src/content/templateSceneSeo.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const sceneRedirects = buildSceneQueryRedirectRoutes()
assert(sceneRedirects.length === TEMPLATE_SCENE_SLUGS.length, 'six scene query redirects')

const retailRule = sceneRedirects.find((r) => r.headers?.Location === '/templates/retail-price')
assert(retailRule, 'retail-price redirect')
assert(retailRule.src === '^/templates$', 'scene redirect path only')
assert(retailRule.has?.some((h) => h.key === 'scene' && h.value === '^retail-price$'), 'scene value')
assert(retailRule.missing?.some((m) => m.key === 'utm_source'), 'blocks utm_source')
assert(
  !sceneRedirects.some((r) => String(r.headers?.Location || '').includes('jewelry')),
  'never redirect jewelry'
)

const strip = buildTrailingSlashStripRoutes(PRERENDER_PATHS)
assert(strip.some((r) => r.headers?.Location === '/templates' && r.src === '^/templates/$'), '/templates/ strip')
assert(strip.some((r) => r.headers?.Location === '/help' && r.src === '^/help/$'), '/help/ strip')
assert(
  strip.some((r) => r.headers?.Location === '/templates/retail-price'),
  'scene landing strip trailing slash'
)

const tpl404 = buildPrefixChild404Routes(
  '/templates',
  TEMPLATE_SCENE_SLUGS.map((s) => `/templates/${s}`)
)
const tplUnknown404 = tpl404.find((r) => r.src === '^/templates/[^/]+$')
assert(tplUnknown404, 'templates unknown child 404')
assert(tplUnknown404.dest === '/404.html' && tplUnknown404.status === 404, 'templates 404 shape')
assert(tplUnknown404['server-name'] === 'file', 'templates prefix 404 server-name file')

for (const prefix of ['/help', '/use-cases']) {
  const children =
    prefix === '/help' ?
      PRERENDER_PATHS.filter((p) => p.startsWith('/help/') && p !== '/help')
    : PRERENDER_PATHS.filter((p) => p.startsWith('/use-cases/'))
  const block = buildPrefixChild404Routes(prefix, children)
  const unk = block.find((r) => r.status === 404)
  assert(unk?.['server-name'] === 'file', `${prefix} prefix 404 server-name file`)
  assert(unk?.dest === FILE_404_RESPONSE.dest, `${prefix} prefix 404 dest`)
}
assert(
  tpl404.some((r) => r.dest === '/templates/retail-price/index.html'),
  'valid scene dest index.html'
)

const full = buildEdgeOneRoutes({ prerenderPaths: PRERENDER_PATHS, edgeoneRedirects: [] })
const fsIdx = full.routes.findIndex((r) => r.handle === 'filesystem')
assert(fsIdx >= 0, 'filesystem handler')
const beforeFs = full.routes.slice(0, fsIdx)
assert(
  beforeFs.some((r) => r.headers?.Location === '/templates/retail-price' && r.status === 301),
  'scene redirect in full config'
)
const stripBeforeFs = beforeFs.filter((r) => r.status === 301 && r.headers?.Location === '/templates')
assert(stripBeforeFs.length >= 1, 'templates slash strip before filesystem')
const addSlash = beforeFs.find((r) => r.continue === true && r.dest === '/$1/')
assert(addSlash, 'add trailing slash continue still present')
assert(addSlash.src === '^/([^.]+[^/.])$', 'add-slash pattern')
const tplNope404 = beforeFs.find(
  (r) => r.status === 404 && r.src === '^/templates/[^/]+$' && r.dest === '/404.html'
)
assert(tplNope404, 'templates nope 404 before filesystem')
assert(tplNope404['server-name'] === 'file', 'full config prefix 404 server-name')

console.log('edgeoneRoutePlan ok')