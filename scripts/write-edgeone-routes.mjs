/**
 * Emit EdgeOne Build Output API routes so Makers does not auto-apply SPA fallback.
 *
 * Platform build writes needsFallback from *source* detection (vue-router → true),
 * which adds `/* → /index.html` (HTTP 200 soft 404). Dist detection is SSG + static
 * 404.html and needs no fallback — see @edgeone/is-spa detectBuildOutput on ./dist.
 *
 * If `.edgeone/routes.json` already exists, the CLI skips auto route generation and
 * keeps this MPA + HTTP 404 catch-all instead.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRERENDER_PATHS } from '../src/content/seoStatic.js'
import { buildEdgeOneRoutes } from '../src/utils/edgeoneRoutePlan.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const edgeonePath = path.join(root, 'edgeone.json')
const distDir = path.join(root, 'dist')
const outDir = path.join(root, '.edgeone')
const outFile = path.join(outDir, 'routes.json')

if (!fs.existsSync(distDir)) {
  console.error('write-edgeone-routes: dist/ not found — run vite build first')
  process.exit(1)
}
if (!fs.existsSync(path.join(distDir, '404.html'))) {
  console.error('write-edgeone-routes: dist/404.html missing')
  process.exit(1)
}

const edgeone = JSON.parse(fs.readFileSync(edgeonePath, 'utf8'))
const payload = buildEdgeOneRoutes({
  prerenderPaths: PRERENDER_PATHS,
  edgeoneRedirects: edgeone.redirects || []
})

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

const assetsConfig = path.join(distDir, '.edgeone-assets-config.json')
fs.writeFileSync(
  assetsConfig,
  `${JSON.stringify({ framework: 'vite', needsFallback: false }, null, 2)}\n`,
  'utf8'
)

console.log(`write-edgeone-routes: wrote ${outFile} (${payload.routes.length} routes, 404 catch-all)`)