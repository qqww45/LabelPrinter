/**
 * Capture real 签立方 /app UI and label canvas exports for public/marketing/.
 * Usage: BASE=http://127.0.0.1:5173 node scripts/capture-marketing.mjs
 */
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public/marketing')
const BASE = process.env.BASE || 'http://127.0.0.1:5173'

const SPECIMENS = [
  ['retail-price', 'sample-price-tag.webp'],
  ['express', 'sample-waybill.webp'],
  ['asset', 'sample-asset-tag.webp'],
  ['warehouse', 'sample-bin-label.webp'],
  ['jewelry', 'sample-jewelry-tag.webp'],
  ['apparel', 'sample-apparel-tag.webp']
]

function pngToWebp(pngPath, webpPath, quality = 88) {
  execFileSync('ffmpeg', [
    '-y', '-i', pngPath,
    '-c:v', 'libwebp',
    '-quality', String(quality),
    webpPath
  ], { stdio: 'pipe' })
  fs.unlinkSync(pngPath)
}

async function waitForCanvas(page) {
  await page.waitForSelector('.label-canvas-wrapper canvas', { timeout: 90000 })
  await page.waitForFunction(() => {
    const cv = document.querySelector('.label-canvas-wrapper canvas')
    return cv && cv.width > 10 && cv.height > 10
  }, { timeout: 60000 })
  await page.waitForTimeout(800)
}

async function dismissOverlays(page) {
  const skip = page.locator('button:has-text("跳过"), button:has-text("稍后")')
  if (await skip.first().isVisible({ timeout: 1500 }).catch(() => false)) {
    await skip.first().click()
  }
  const onboardClose = page.locator('.onboarding-card button:has-text("×"), .onboarding-card .btn-primary')
  if (await onboardClose.first().isVisible({ timeout: 500 }).catch(() => false)) {
    await onboardClose.first().click()
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'zh-CN'
  })
  await context.addInitScript(() => {
    try {
      localStorage.setItem('labelprint_onboarding_dismissed', '1')
      localStorage.setItem('labelprint_intro_done', '1')
    } catch { /* ignore */ }
  })

  const page = await context.newPage()

  // Hero: real editor chrome with grocery price template
  await page.goto(`${BASE}/app?applyPack=retail-price`, { waitUntil: 'networkidle' })
  await dismissOverlays(page)
  await waitForCanvas(page)
  const heroPng = path.join(OUT, '_hero-tmp.png')
  await page.locator('.app-shell').screenshot({ path: heroPng })
  pngToWebp(heroPng, path.join(OUT, 'hero-app-editor.webp'), 90)
  console.log('wrote hero-app-editor.webp')

  for (const [packId, outName] of SPECIMENS) {
    await page.goto(`${BASE}/app?applyPack=${packId}`, { waitUntil: 'networkidle' })
    await dismissOverlays(page)
    await waitForCanvas(page)
    const tmp = path.join(OUT, `_spec-${packId}.png`)
    await page.locator('.label-canvas-wrapper').screenshot({ path: tmp })
    pngToWebp(tmp, path.join(OUT, outName), 92)
    console.log('wrote', outName)
  }

  // Help band collage from real canvas specimen exports
  const stripNames = ['sample-price-tag', 'sample-waybill', 'sample-asset-tag', 'sample-bin-label']
  const stripParts = []
  for (const name of stripNames) {
    const p = path.join(OUT, `_${name}-pad.png`)
    execFileSync('ffmpeg', [
      '-y', '-i', path.join(OUT, `${name}.webp`),
      '-vf', 'scale=280:280:force_original_aspect_ratio=decrease,pad=280:280:(ow-iw)/2:(oh-ih)/2:color=white',
      p
    ], { stdio: 'pipe' })
    stripParts.push(p)
  }
  const stickersPng = path.join(OUT, '_stickers.png')
  execFileSync('ffmpeg', [
    '-y',
    '-i', stripParts[0], '-i', stripParts[1], '-i', stripParts[2], '-i', stripParts[3],
    '-filter_complex', '[0:v][1:v][2:v][3:v]hstack=inputs=4',
    '-frames:v', '1', '-update', '1', stickersPng
  ], { stdio: 'pipe' })
  for (const p of stripParts) fs.unlinkSync(p)
  pngToWebp(stickersPng, path.join(OUT, 'hero-label-stickers.webp'), 85)
  console.log('wrote hero-label-stickers.webp')

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
