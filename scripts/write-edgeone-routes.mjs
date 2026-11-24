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

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const edgeonePath = path.join(root, 'edgeone.json')
const distDir = path.join(root, 'dist')
const outDir = path.join(root, '.edgeone')
const outFile = path.join(outDir, 'routes.json')

/** @param {string} source */
function sourceToRe2(source) {
  const s = String(source).trim()
  if (!s.startsWith('/')) throw new Error(`redirect source must start with /: ${source}`)
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return `^${escaped}$`
}

/** @param {Array<{ source: string, destination: string, statusCode?: number }>} redirects */
function redirectRoutes(redirects) {
  if (!Array.isArray(redirects)) return []
  return redirects.map((r) => {
    const status = Number(r.statusCode) || 301
    const dest = String(r.destination)
    const location = dest.startsWith('http') ? dest : dest.startsWith('/') ? dest : `/${dest}`
    return {
      src: sourceToRe2(r.source),
      headers: { Location: location },
      status
    }
  })
}

function hasDirectoryIndexHtml(dir) {
  if (!fs.existsSync(dir)) return false
  const stack = [dir]
  while (stack.length) {
    const cur = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      const full = path.join(cur, ent.name)
      if (ent.isDirectory()) {
        stack.push(full)
        continue
      }
      if (ent.isFile() && ent.name === 'index.html' && path.dirname(full) !== distDir) {
        return true
      }
    }
  }
  return false
}

function buildRoutes() {
  const edgeone = JSON.parse(fs.readFileSync(edgeonePath, 'utf8'))
  const routes = [...redirectRoutes(edgeone.redirects)]

  if (hasDirectoryIndexHtml(distDir)) {
    routes.push({ src: '^/([^.]+[^/.])$', dest: '/$1/', continue: true })
  }

  routes.push({ handle: 'filesystem' })
  routes.push({
    src: '/.*',
    dest: '/404.html',
    status: 404,
    'server-name': 'file'
  })

  return { version: 3, routes }
}

if (!fs.existsSync(distDir)) {
  console.error('write-edgeone-routes: dist/ not found — run vite build first')
  process.exit(1)
}
if (!fs.existsSync(path.join(distDir, '404.html'))) {
  console.error('write-edgeone-routes: dist/404.html missing')
  process.exit(1)
}

const payload = buildRoutes()
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

const assetsConfig = path.join(distDir, '.edgeone-assets-config.json')
fs.writeFileSync(
  assetsConfig,
  `${JSON.stringify({ framework: 'vite', needsFallback: false }, null, 2)}\n`,
  'utf8'
)

console.log(`write-edgeone-routes: wrote ${outFile} (${payload.routes.length} routes, 404 catch-all)`)