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
  'public/sitemap.xml'
]
for (const rel of mustUseOfficial) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8')
  assert(text.includes(OFFICIAL_SITE_ORIGIN), `${rel} must mention ${OFFICIAL_SITE_ORIGIN}`)
  assert(!text.includes(STALE_OFFICIAL_HOST), `${rel} must not mention ${STALE_OFFICIAL_HOST}`)
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
assert(indexHtml.includes(`href="${OFFICIAL_SITE_URL}"`), 'canonical must use trailing-slash official URL')
assert(indexHtml.includes(`"url": "${OFFICIAL_SITE_URL}"`), 'JSON-LD url must match official site')

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
assert(pkg.homepage === OFFICIAL_SITE_URL, 'package.json homepage must match official site')

console.log('officialSite ok')
