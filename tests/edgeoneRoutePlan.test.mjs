import {
  buildEdgeOneRoutes,
  buildSceneQueryRedirectRoutes,
  buildTrailingSlashStripRoutes,
  buildPrefixChildDestRoutes,
  FILE_404_RESPONSE,
  GENERAL_TRAILING_SLASH_STRIP,
  NESTED_MARKETING_PREFIX_MISS_REWRITE
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

const tplDests = buildPrefixChildDestRoutes(
  '/templates',
  TEMPLATE_SCENE_SLUGS.map((s) => `/templates/${s}`)
)
assert(
  !tplDests.some((r) => r.status === 404 || r.dest === '/404.html'),
  'prefix child builder must not emit 404'
)
assert(
  tplDests.some((r) => r.dest === '/templates/retail-price/index.html'),
  'valid scene dest index.html'
)

const full = buildEdgeOneRoutes({ prerenderPaths: PRERENDER_PATHS, edgeoneRedirects: [] })
const fsIdx = full.routes.findIndex((r) => r.handle === 'filesystem')
assert(fsIdx >= 0, 'filesystem handler')
const beforeFs = full.routes.slice(0, fsIdx)
const afterFs = full.routes.slice(fsIdx + 1)

assert(
  !beforeFs.some((r) => r.status === 404 && r.dest === '/404.html'),
  'no pre-filesystem 404 routes'
)
assert(
  beforeFs.some((r) => r.headers?.Location === '/templates/retail-price' && r.status === 301),
  'scene redirect in full config'
)
const stripBeforeFs = beforeFs.filter((r) => r.status === 301 && r.headers?.Location === '/templates')
assert(stripBeforeFs.length >= 1, 'templates slash strip before filesystem')
assert(!beforeFs.some((r) => r.continue === true), 'no add-slash continue before filesystem')
const generalStrip = beforeFs.find(
  (r) => r.src === GENERAL_TRAILING_SLASH_STRIP.src && r.status === 301
)
assert(generalStrip, 'general trailing-slash 301 before filesystem')
assert(generalStrip.headers?.Location === '/$1', 'general strip Location /$1')
const generalIdx = beforeFs.indexOf(generalStrip)
const prefixMiss = beforeFs.find(
  (r) => r.src === NESTED_MARKETING_PREFIX_MISS_REWRITE.src && r.dest === '/__not_found'
)
assert(prefixMiss, 'nested prefix miss rewrite before filesystem')
assert(prefixMiss.status == null && prefixMiss.headers == null, 'rewrite is internal only')
assert(beforeFs.indexOf(prefixMiss) > generalIdx, 'rewrite after general trailing-slash strip')
assert(
  beforeFs.some((r) => r.dest === '/templates/retail-price/index.html'),
  'valid child dest before filesystem'
)
const retailDestIdx = beforeFs.findIndex((r) => r.dest === '/templates/retail-price/index.html')
assert(retailDestIdx >= 0 && retailDestIdx < generalIdx, 'valid dest wins before general strip')

const catchAll = afterFs.find((r) => r.src === '/.*')
assert(catchAll, 'post-filesystem catch-all')
assert(catchAll.dest === FILE_404_RESPONSE.dest, 'catch-all dest')
assert(catchAll.status === FILE_404_RESPONSE.status, 'catch-all status')
assert(catchAll['server-name'] === 'file', 'catch-all server-name file')

console.log('edgeoneRoutePlan ok')