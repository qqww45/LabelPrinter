import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import JSZip from 'jszip'

const __dir = dirname(fileURLToPath(import.meta.url))
const fixturePdf = join(__dir, '../tests/fixtures/label-import-mini.pdf')

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('labelprint_onboarding_dismissed', '1')
    localStorage.setItem('labelprint_intro_done', '1')
  })
  page.on('dialog', (dialog) => dialog.accept())
})

async function openTemplateLibrary(page) {
  const inToolbar = page.locator('.group-secondary [data-sec-id="template-library"]')
  if (await inToolbar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await inToolbar.click()
  } else {
    await page.locator('.group-more .btn').first().click()
    await page.getByRole('menuitem', { name: /^模板库/ }).click()
  }
  await expect(page.getByTestId('industry-chips')).toBeVisible({ timeout: 30000 })
}

async function applyFirstTemplateInChip(page, chipLabel) {
  await openTemplateLibrary(page)
  await page.locator('.industry-chips .chip').filter({ hasText: chipLabel }).click()
  await page.locator('.tpl-item').first().click()
  await page.getByTestId('template-apply').click()
  await expect(page.locator('.info-bar')).toBeVisible({ timeout: 15000 })
}

test('industry templates apply via dialog with expected label size', async ({ page }) => {
  const chips = ['价签', '面单', '资产贴', '服装吊牌', '洗水唛']
  for (const chip of chips) {
    await page.goto('/app')
    await expect(page.getByTestId('design-canvas')).toBeVisible({ timeout: 30000 })
    await applyFirstTemplateInChip(page, chip)

    const summary = await page.evaluate(() => {
      const project = window.__labelprintTest.pinia._s.get('project')
      const p = project.project
      return {
        w: p.label?.width,
        h: p.label?.height,
        n: (p.components || []).length,
        paper: `${p.paper?.width}×${p.paper?.height}`
      }
    })
    expect(summary.n).toBeGreaterThan(2)
    expect(summary.w).toBeGreaterThan(20)
    expect(summary.h).toBeGreaterThan(15)
    expect(page.locator('.info-bar')).toContainText(summary.paper)
  }
})

test('field-bound text renders column value in preview, not stale static text', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByTestId('design-canvas')).toBeVisible({ timeout: 30000 })

  await page.evaluate(async () => {
    const pinia = window.__labelprintTest?.pinia
    const project = pinia._s.get('project')
    const data = pinia._s.get('data')
    data.rows = [{ __id: 'e2e1', __print: true, 规格: '5kg', 产品名称: '测试' }]
    data.headers = ['规格', '产品名称']
    data.activeRowIndex = 0
    project.addComponent({
      id: 'e2e_spec_text',
      type: 'text',
      name: '规格',
      left: 5,
      top: 5,
      width: 40,
      height: 8,
      text: '东北大米',
      fontSize: 12,
      fill: '#000',
      fontFamily: 'Microsoft YaHei',
      fontWeight: 'normal',
      textAlign: 'left',
      binding: '规格',
      dataMode: 'field'
    })
  })
  await page.waitForTimeout(1200)

  await page.getByRole('button', { name: /^预览/ }).click()
  const slot = page.getByTestId('preview-label-slot').first()
  await expect(slot).toBeVisible({ timeout: 15000 })
  await expect(slot).toContainText('5kg')
  await expect(slot).not.toContainText('东北大米')
})

test('arrow appears in preview and zip export has distinct per-label PDFs', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByTestId('design-canvas')).toBeVisible({ timeout: 30000 })

  await page.evaluate(() => {
    const pinia = window.__labelprintTest.pinia
    const project = pinia._s.get('project')
    const data = pinia._s.get('data')
    data.rows = [
      { __id: 'z1', __print: true, 品名: '标签A' },
      { __id: 'z2', __print: true, 品名: '标签B' }
    ]
    data.headers = ['品名']
    data.activeRowIndex = 0
    project.addComponent({
      id: 'e2e_arrow',
      type: 'arrow',
      name: '箭头',
      left: 10,
      top: 10,
      width: 24,
      height: 12,
      stroke: '#2563eb',
      strokeWidth: 0.5,
      strokeStyle: 'dashed',
      arrowDirection: 'right'
    })
    project.addComponent({
      id: 'e2e_name',
      type: 'text',
      name: '品名',
      left: 5,
      top: 24,
      width: 40,
      height: 6,
      text: '',
      fontSize: 10,
      binding: '品名',
      dataMode: 'field'
    })
  })
  await page.waitForTimeout(1000)

  await page.getByRole('button', { name: /^预览/ }).click()
  const slot = page.getByTestId('preview-label-slot').first()
  await expect(slot.locator('svg line, svg polygon')).toHaveCount(2, { timeout: 15000 })

  await page.getByRole('button', { name: /更多/ }).click()
  const downloadPromise = page.waitForEvent('download', { timeout: 120000 })
  await page.getByTestId('export-zip').click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const zipBuf = readFileSync(path)
  const zip = await JSZip.loadAsync(zipBuf)
  const names = Object.keys(zip.files).filter((n) => !n.endsWith('/') && n.endsWith('.pdf'))
  expect(names.length).toBeGreaterThanOrEqual(2)
  const pdfs = []
  for (const name of names.filter((n) => !n.includes('batch'))) {
    pdfs.push(await zip.file(name).async('uint8array'))
  }
  expect(pdfs.length).toBeGreaterThanOrEqual(2)
  expect(pdfs[0].length).toBeGreaterThan(100)
  expect(pdfs[1].length).toBeGreaterThan(100)
  let same = pdfs[0].length === pdfs[1].length
  if (same) {
    same = pdfs[0].every((b, i) => b === pdfs[1][i])
  }
  expect(same).toBe(false)
})

test('label import uploads PDF fixture into editable components', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByTestId('design-canvas')).toBeVisible({ timeout: 30000 })

  const importBtn = page.getByRole('button', { name: /识图|识别标签/ }).first()
  if (!(await importBtn.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /更多/ }).first().click()
    await page.getByRole('menuitem', { name: /识别标签/ }).click()
  } else {
    await importBtn.click()
  }
  await expect(page.getByTestId('label-import-dialog')).toBeVisible()

  await page.getByTestId('label-import-file').setInputFiles(fixturePdf)
  await expect(page.getByTestId('label-import-dialog')).toBeHidden({ timeout: 60000 })

  const imported = await page.evaluate(() => {
    const p = window.__labelprintTest.pinia._s.get('project').project
    const texts = (p.components || []).filter((c) => c.type === 'text').map((c) => c.text)
    return {
      count: p.components.length,
      hasE2E: texts.some((t) => String(t).includes('E2E') || String(t).includes('SKU')),
      hasBarcode: (p.components || []).some((c) => c.type === 'barcode' && String(c.text).length >= 8),
      hasRefBg: (p.components || []).some((c) => c.type === 'image' && c.name === '参考底图')
    }
  })
  expect(imported.count).toBeGreaterThan(2)
  expect(imported.hasE2E).toBe(true)
  expect(imported.hasBarcode || imported.hasE2E).toBe(true)
})