import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const fixturePng = join(__dir, '../tests/fixtures/label-mini.png')

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

test('template library industry filters and wash template apply', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByTestId('design-canvas')).toBeVisible({ timeout: 30000 })

  await openTemplateLibrary(page)
  for (const label of ['价签', '面单', '资产贴', '服装吊牌', '洗水唛']) {
    await expect(page.locator('.industry-chips .chip').filter({ hasText: label })).toBeVisible()
  }

  await page.locator('.industry-chips .chip').filter({ hasText: '洗水唛' }).click()
  await page.locator('.tpl-item').first().click()
  await page.getByTestId('template-apply').click()
  await expect(page.locator('.info-bar')).toContainText(/60|50/, { timeout: 15000 })

  const applied = await page.evaluate(async () => {
    const pinia = window.__labelprintTest.pinia
    const project = pinia._s.get('project')
    const { templatesForIndustry } = await import('/src/utils/industryTemplates.js')
    const cats = ['price', 'shipping', 'asset', 'apparel', 'wash']
    return cats.every((id) => templatesForIndustry(id).length > 0 && project.project.components.length > 0)
  })
  expect(applied).toBe(true)
})

test('field-bound text shows column value not stale static text', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByTestId('design-canvas')).toBeVisible({ timeout: 30000 })

  const bound = await page.evaluate(async () => {
    const pinia = window.__labelprintTest?.pinia
    if (!pinia?._s) return null
    const project = pinia._s.get('project')
    const data = pinia._s.get('data')
    data.rows = [{ __id: 'e2e1', 规格: '5kg', 产品名称: '测试' }]
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
    const mod = await import('/src/utils/render.js')
    const row = data.rows[0]
    const c = project.project.components.find((x) => x.id === 'e2e_spec_text')
    return mod.textPayload(c, row)
  })

  expect(bound).toBe('5kg')
})

test('arrow component and zip export controls exist', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByTestId('design-canvas')).toBeVisible({ timeout: 30000 })

  await page.evaluate(() => {
    const pinia = window.__labelprintTest.pinia
    pinia._s.get('project').requestAddComponent('arrow')
  })
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: /预览/ }).click()
  await page.getByRole('button', { name: /更多/ }).click()
  await expect(page.getByTestId('export-zip')).toBeVisible()
})

test('label import dialog opens and accepts fixture', async ({ page }) => {
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

  let pngBuf
  try {
    pngBuf = readFileSync(fixturePng)
  } catch {
    pngBuf = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
  }

  const componentsAfter = await page.evaluate(async () => {
    const pinia = window.__labelprintTest.pinia
    const project = pinia._s.get('project')
    const core = await import('/src/utils/labelImportCore.js')
    const fixture = {
      lines: [
        { text: '演示商品', x: 10, y: 10, w: 80, h: 14, fontSize: 12 },
        { text: '6901234567890', x: 10, y: 40, w: 120, h: 20, fontSize: 10 }
      ],
      scalePxPerMm: 4
    }
    core.resetLabelImportIds(0)
    const grouped = core.groupOcrLines(fixture.lines)
    const layout = core.layoutLinesToComponents(grouped, { width: 60, height: 40 }, { scalePxPerMm: fixture.scalePxPerMm })
    project.applyTemplate({
      id: 'e2e_import',
      name: '识别版式',
      group: '导入',
      desc: 'e2e',
      fields: [],
      ...layout
    })
    return project.project.components.length
  })

  expect(componentsAfter).toBeGreaterThan(0)
})