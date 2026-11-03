/**
 * Capture 签立方 marketing WebPs from /app (and optional print preview).
 *
 * Preferred workflow:
 * - Drop production Print Preview crops into public/marketing/ (sample-price-tag, etc.)
 * - Use this script for hero-app-editor.webp with white desk + grid off:
 *     BASE=http://127.0.0.1:5173 node scripts/capture-marketing.mjs --hero-only
 *
 * Requires one-off: npm install --no-save playwright && npx playwright install chromium
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
const heroOnly = process.argv.includes('--hero-only')
const retailSpecimenOnly = process.argv.includes('--retail-specimen-only')
const MARKETING_QS = 'marketingCapture=1'
/** Simple retail templates used for marketing specimens (not tpl_retail_shelf_70). */
const MARKETING_PRICE_TEMPLATE = 'tpl_price_tag'

/** Scene pack id → output filename (canvas fallback when no print preview asset) */
const SPECIMENS = [
  ['retail-price', 'sample-price-tag.webp'],
  ['express', 'sample-waybill.webp'],
  ['asset', 'sample-asset-tag.webp'],
  ['warehouse', 'sample-bin-label.webp'],
  ['jewelry', 'sample-jewelry-tag.webp'],
  ['apparel', 'sample-apparel-tag.webp']
]

/** Print preview: template id → output file */
const PREVIEW_BY_TEMPLATE = [
  [MARKETING_PRICE_TEMPLATE, 'sample-price-tag.webp'],
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

function rebuildStickerStrip() {
  const stripNames = ['sample-price-tag', 'sample-waybill', 'sample-asset-tag', 'sample-bin-label']
  const stripParts = []
  for (const name of stripNames) {
    const src = path.join(OUT, `${name}.webp`)
    if (!fs.existsSync(src)) continue
    const p = path.join(OUT, `_${name}-pad.png`)
    execFileSync('ffmpeg', [
      '-y', '-i', src,
      '-vf', 'scale=280:280:force_original_aspect_ratio=decrease,pad=280:280:(ow-iw)/2:(oh-ih)/2:color=white',
      p
    ], { stdio: 'pipe' })
    stripParts.push(p)
  }
  if (stripParts.length < 2) return
  const stickersPng = path.join(OUT, '_stickers.png')
  const inputs = stripParts.flatMap((p, i) => ['-i', p])
  execFileSync('ffmpeg', [
    '-y',
    ...inputs,
    '-filter_complex', `${stripParts.map((_, i) => `[${i}:v]`).join('')}hstack=inputs=${stripParts.length}`,
    '-frames:v', '1', '-update', '1', stickersPng
  ], { stdio: 'pipe' })
  for (const p of stripParts) fs.unlinkSync(p)
  pngToWebp(stickersPng, path.join(OUT, 'hero-label-stickers.webp'), 85)
  console.log('wrote hero-label-stickers.webp')
}

async function waitForCanvas(page) {
  await page.waitForSelector('.label-canvas-wrapper canvas', { timeout: 90000 })
  await page.waitForFunction(() => {
    const cv = document.querySelector('.label-canvas-wrapper canvas')
    return cv && cv.width > 10 && cv.height > 10
  }, { timeout: 60000 })
  await page.waitForTimeout(900)
}

async function dismissOverlays(page) {
  const skip = page.locator('button:has-text("跳过"), button:has-text("稍后")')
  if (await skip.first().isVisible({ timeout: 1500 }).catch(() => false)) {
    await skip.first().click()
  }
}

async function captureHero(page) {
  const url = `${BASE}/app?applyTemplate=${MARKETING_PRICE_TEMPLATE}&${MARKETING_QS}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await dismissOverlays(page)
  await waitForCanvas(page)
  const heroPng = path.join(OUT, '_hero-tmp.png')
  await page.locator('.app-shell').screenshot({ path: heroPng })
  pngToWebp(heroPng, path.join(OUT, 'hero-app-editor.webp'), 90)
  console.log(`wrote hero-app-editor.webp (${MARKETING_PRICE_TEMPLATE}, white desk, grid off)`)
}

async function capturePrintPreviewForTemplate(page, templateId, outName) {
  const url = `${BASE}/app?applyTemplate=${templateId}&${MARKETING_QS}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await dismissOverlays(page)
  await waitForCanvas(page)
  const previewBtn = page.getByRole('button', { name: '预览' }).first()
  await previewBtn.click()
  await page.waitForSelector('.preview-modal .label-slot', { timeout: 45000 })
  await page.waitForTimeout(1000)
  const slot = page.locator('.preview-modal .label-slot').first()
  const tmp = path.join(OUT, `_prev-${templateId}.png`)
  await slot.screenshot({ path: tmp })
  pngToWebp(tmp, path.join(OUT, outName), 93)
  console.log('wrote', outName, `(print preview · ${templateId})`)
  await page.keyboard.press('Escape').catch(() => {})
  return true
}

async function capturePrintPreviewForPack(page, packId, outName) {
  const url = `${BASE}/app?applyPack=${packId}&${MARKETING_QS}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await dismissOverlays(page)
  await waitForCanvas(page)
  const previewBtn = page.getByRole('button', { name: '预览' }).first()
  await previewBtn.click()
  await page.waitForSelector('.preview-modal .label-slot', { timeout: 45000 })
  await page.waitForTimeout(1000)
  const slot = page.locator('.preview-modal .label-slot').first()
  const tmp = path.join(OUT, `_prev-${packId}.png`)
  await slot.screenshot({ path: tmp })
  pngToWebp(tmp, path.join(OUT, outName), 93)
  console.log('wrote', outName, `(print preview · pack ${packId})`)
  await page.keyboard.press('Escape').catch(() => {})
}

const PREVIEW_PACKS = [
  ['express', 'sample-waybill.webp'],
  ['asset', 'sample-asset-tag.webp']
]

async function captureCanvasSpecimen(page, packId, outName) {
  const url = `${BASE}/app?applyPack=${packId}&${MARKETING_QS}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await dismissOverlays(page)
  await page.evaluate(() => document.body.classList.add('marketing-capture-specimen'))
  await waitForCanvas(page)
  const tmp = path.join(OUT, `_spec-${packId}.png`)
  await page.locator('.label-canvas-wrapper').screenshot({ path: tmp })
  pngToWebp(tmp, path.join(OUT, outName), 92)
  console.log('wrote', outName, '(canvas)')
  await page.evaluate(() => document.body.classList.remove('marketing-capture-specimen'))
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

  if (retailSpecimenOnly) {
    await capturePrintPreviewForTemplate(page, MARKETING_PRICE_TEMPLATE, 'sample-price-tag.webp')
    rebuildStickerStrip()
    await browser.close()
    return
  }

  if (heroOnly) {
    await captureHero(page)
    await browser.close()
    return
  }

  await captureHero(page)

  for (const [templateId, outName] of PREVIEW_BY_TEMPLATE) {
    await capturePrintPreviewForTemplate(page, templateId, outName)
  }

  for (const [packId, outName] of PREVIEW_PACKS) {
    await capturePrintPreviewForPack(page, packId, outName)
  }

  for (const [packId, outName] of SPECIMENS) {
    if (packId === 'retail-price') continue
    if (PREVIEW_PACKS.some(([id]) => id === packId)) continue
    await captureCanvasSpecimen(page, packId, outName)
  }

  rebuildStickerStrip()
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
