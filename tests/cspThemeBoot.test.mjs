import fs from 'node:fs'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const nginx = fs.readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8')
const boot = fs.readFileSync(new URL('../public/theme-boot.js', import.meta.url), 'utf8')

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
assert(scripts.length > 0, 'index.html should contain scripts')

for (const [, attrs, body] of scripts) {
  const type = /type\s*=\s*"([^"]+)"/.exec(attrs)?.[1] || ''
  if (type === 'application/ld+json') continue
  assert(/\ssrc\s*=\s*"\//.test(` ${attrs}`), `executable script must be external, got: ${attrs}`)
  assert(!body.trim(), 'external script tag should not also contain inline code')
  assert(!/\b(async|defer)\b/.test(attrs), 'theme boot must stay parser-blocking')
  assert(!/type\s*=\s*"module"/.test(attrs) || attrs.includes('/src/main.js'), 'only the app entry is a module')
}

assert(html.includes('<script src="/theme-boot.js"></script>'), 'theme boot script missing')
assert(!/type\s*=\s*"module"[^>]*theme-boot|theme-boot\.js"[^>]*type\s*=\s*"module"/.test(html), 'theme boot must not be a module')

assert(boot.includes("localStorage.getItem('labelprint_settings_v1')"), 'boot reads settings key')
assert(boot.includes("dataset.theme = 'dark'"), 'boot sets dark theme before paint')

assert(nginx.includes("script-src 'self'"), 'script-src stays self')
assert(!/script-src[^;]*unsafe-inline/.test(nginx), 'script-src must not allow unsafe-inline')
assert(!nginx.includes('sha256-'), 'do not pin a script hash; the boot file is external')

// EdgeOne：/theme-boot.js 是静态文件，二次访问要直接走缓存，不能被 /* 的 no-cache 覆盖
const eo = JSON.parse(fs.readFileSync(new URL('../edgeone.json', import.meta.url), 'utf8'))
const bootRuleIdx = eo.headers.findIndex((h) => h.source === '/theme-boot.js')
const catchAllIdx = eo.headers.findIndex((h) => h.source === '/*')
assert(bootRuleIdx >= 0, 'edgeone.json must add a /theme-boot.js header rule')
assert(bootRuleIdx > catchAllIdx, 'the boot rule must come after /* so it overrides the catch-all')

const bootCache = eo.headers[bootRuleIdx].headers.find((h) => h.key === 'Cache-Control')
assert(bootCache, 'boot rule needs a Cache-Control header')
assert(/max-age=[1-9]/.test(bootCache.value), 'boot file must have a positive max-age')
assert(!/\bno-cache\b|\bno-store\b/.test(bootCache.value), 'boot file must not be no-cache')

const bootEdge = (eo.caches || []).find((c) => c.source === '/theme-boot.js')
assert(bootEdge && bootEdge.cacheTtl > 0, 'edge cacheTtl for the boot file is missing')
assert(nginx.includes('location = /theme-boot.js'), 'nginx should cache the boot file too')

console.log('cspThemeBoot ok')
