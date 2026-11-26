import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const routesPath = path.join(root, '.edgeone', 'routes.json')
assert(fs.existsSync(routesPath), 'run npm run build to generate .edgeone/routes.json')

const doc = JSON.parse(fs.readFileSync(routesPath, 'utf8'))
assert(doc.version === 3, 'routes version 3')
assert(Array.isArray(doc.routes), 'routes array')

const catchAll = doc.routes.filter((r) => r.src === '/.*')
assert(catchAll.length === 1, 'single catch-all route')
assert(catchAll[0].dest === '/404.html', 'catch-all serves 404.html')
assert(catchAll[0].status === 404, 'catch-all HTTP 404')
assert(
  !doc.routes.some((r) => r.dest === '/index.html' && r.src === '/.*'),
  'must not SPA-fallback unknown paths to index.html'
)

const fsIdx = doc.routes.findIndex((r) => r.handle === 'filesystem')
assert(fsIdx >= 0, 'filesystem handler present')
const afterFs = doc.routes.slice(fsIdx + 1)
assert(afterFs.some((r) => r.dest === '/404.html'), '404 after filesystem')

const edgeone = JSON.parse(fs.readFileSync(path.join(root, 'edgeone.json'), 'utf8'))
for (const red of edgeone.redirects || []) {
  const match = doc.routes.find(
    (r) => r.headers?.Location === red.destination && r.status === red.statusCode
  )
  assert(match, `routes.json includes redirect ${red.source}`)
}

const fsIdx2 = doc.routes.findIndex((r) => r.handle === 'filesystem')
const preFs = doc.routes.slice(0, fsIdx2)
assert(
  preFs.some((r) => r.headers?.Location === '/templates/retail-price' && r.status === 301),
  'routes.json scene query 301'
)
assert(
  preFs.some((r) => r.headers?.Location === '/templates' && r.src === '^/templates/$'),
  'routes.json /templates/ strip'
)
assert(
  !preFs.some((r) => r.status === 404 && r.dest === '/404.html'),
  'no pre-filesystem 404 in routes.json'
)
assert(
  preFs.some((r) => r.dest === '/templates/retail-price/index.html'),
  'routes.json valid template child dest'
)
assert(!preFs.some((r) => r.continue === true), 'routes.json no add-slash continue')
assert(
  preFs.some((r) => r.src === '^/(.+)/$' && r.headers?.Location === '/$1' && r.status === 301),
  'routes.json general trailing-slash 301'
)
const generalStripIdx = preFs.findIndex((r) => r.src === '^/(.+)/$' && r.status === 301)
const prefixRewriteIdx = preFs.findIndex(
  (r) => r.src === '^/(templates|help|use-cases)/.+$' && r.dest === '/__not_found'
)
assert(prefixRewriteIdx >= 0, 'routes.json nested prefix miss rewrite')
assert(
  preFs[prefixRewriteIdx].status == null,
  'routes.json prefix rewrite no status'
)
assert(prefixRewriteIdx > generalStripIdx, 'routes.json rewrite after general strip')
assert(catchAll[0]?.['server-name'] === 'file', 'catch-all 404 server-name file')

const assetsCfg = path.join(root, 'dist', '.edgeone-assets-config.json')
assert(fs.existsSync(assetsCfg), 'dist/.edgeone-assets-config.json')
const assets = JSON.parse(fs.readFileSync(assetsCfg, 'utf8'))
assert(assets.needsFallback === false, 'dist assets config disables SPA fallback')

let needsFallbackDist = true
try {
  const { needsFallback, detectBuildOutput } = require('@edgeone/is-spa')
  const det = detectBuildOutput(path.join(root, 'dist'))
  needsFallbackDist = needsFallback(path.join(root, 'dist'), { mode: 'dist' })
  assert(det.type === 'ssg' || det.type === 'mpa', `dist detect type ${det.type}`)
  assert(det.details?.hasStaticRoot404, 'dist has static 404.html')
} catch (e) {
  console.warn('edgeoneRoutes: skip @edgeone/is-spa (install dev dep locally):', e.message)
}
assert(needsFallbackDist === false, 'dist build output must not need index.html fallback')

console.log('edgeoneRoutes ok')