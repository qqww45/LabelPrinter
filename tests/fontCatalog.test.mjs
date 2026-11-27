import assert from 'node:assert/strict'
import { FONT_GROUPS, FONT_SET, FONT_VALUES } from '../src/utils/fontCatalog.js'
import { buildAdjustPrompt, normalizeAdjustPlan, packAdjustContext } from '../src/utils/ai.js'

assert.ok(FONT_SET.has('Segoe Print'), 'Segoe Print 在 AI 允许的字体里')
assert.ok(FONT_SET.has('Ink Free'), 'Ink Free 在 AI 允许的字体里')
assert.ok(FONT_VALUES.includes('Bradley Hand ITC'), '手写字体使用了系统里的真实字体名')
assert.ok(FONT_VALUES.length > 20, '字体列表已扩充')
assert.ok(FONT_GROUPS.some(g => g.items.some(i => i.value === 'Segoe Print')), '属性面板分组里有 Segoe Print')

const text = { id: 't1', type: 'text', name: '提示', text: 'Scan Me!', fontSize: 12, left: 2, top: 2, width: 20, height: 6 }
const plan = normalizeAdjustPlan({
  componentUpdates: [{ id: 't1', fontFamily: 'Segoe Print' }]
}, { fields: [], components: [text], labelWidth: 60, labelHeight: 40, rowCount: 1 })
assert.equal(plan.plan.componentUpdates[0].patch.fontFamily, 'Segoe Print', 'AI 改手写字体不会被白名单丢掉')

const ctx = packAdjustContext({
  project: {
    label: { width: 40, height: 30 },
    paper: { width: 40, height: 30 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    layout: { mode: 'single', cols: 1, rows: 1 },
    printConfig: {},
    components: [text]
  },
  fields: [],
  rows: [],
  selectedIds: ['t1']
})
assert.ok(buildAdjustPrompt(ctx).includes('Segoe Print'), 'AI 提示词里能看到新字体')

console.log('fontCatalog ok')
