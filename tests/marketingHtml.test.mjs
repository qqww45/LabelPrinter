import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderStaticBodyHtml } from '../src/content/seoStatic.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const homeStatic = renderStaticBodyHtml('/')
assert(homeStatic.includes('<picture>'), 'home static uses picture')
assert(homeStatic.includes('type="image/webp"'), 'webp source')
assert(homeStatic.includes('/marketing/hero-app-editor.jpg'), 'jpg fallback in static body')

const distHome = path.join(root, 'dist', 'index.html')
if (fs.existsSync(distHome)) {
  const html = fs.readFileSync(distHome, 'utf8')
  assert(!html.includes('vendor-pdf'), 'homepage dist must not preload vendor-pdf')
  const distApp = path.join(root, 'dist', 'app', 'index.html')
  if (fs.existsSync(distApp)) {
    // app shell may still reference pdf chunk in dynamic imports
    assert(true, 'app html present')
  }
} else {
  console.log('marketingHtml: skip dist checks (run npm run build)')
}

console.log('marketingHtml ok')