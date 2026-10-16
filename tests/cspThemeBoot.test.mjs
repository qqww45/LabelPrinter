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

console.log('cspThemeBoot ok')
