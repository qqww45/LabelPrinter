import { expandPrintLabels, paginateLabels, pageForSourceRow } from '../src/utils/printModel.js'
import { gridForSheet, sheetPresetPatch, SHEET_PRESETS } from '../src/utils/sheetPreset.js'
import { runDiagnostics, layoutFitsPaper } from '../src/utils/diagnose.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const rows = [
  { 品名: '甲' },
  { 品名: '乙', __print: false },
  { 品名: '丙' }
]
const labels = expandPrintLabels(rows, { copies: 1 })
assert(labels.length === 2, '没勾的行不进打印')
assert(labels[1].sourceIndex === 2, '后面的行仍记住原来的位置')
assert(expandPrintLabels([{ __print: false }], {}).length === 0, '全部取消时不留空白张')
assert(expandPrintLabels([{ 品名: '甲' }], {}).length === 1, '没标过的行照常打')

const pages = paginateLabels(labels, 4, 3)
assert(pages[0].slots[0].empty && pages[0].slots[1].empty, '前两格留空')
assert(pages[0].slots[2].row.品名 === '甲', '从第三格开始放数据')
assert(pageForSourceRow(labels, 2, 4, 4) === 2, '起始格把后面的行推到下一页')
assert(paginateLabels([{ 品名: '甲' }, { 品名: '乙' }], 2).length === 1, '不设起始格时和原来一样')

const preset = SHEET_PRESETS.find(p => p.name === 'A4 · 60×40')
const patch = sheetPresetPatch(preset)
const grid = gridForSheet(preset)
assert(patch.layout.cols === grid.cols && patch.layout.rows === grid.rows, '整页规格的行列和自动排版相同')
const fit = layoutFitsPaper({
  paper: patch.paper,
  margin: patch.margin,
  label: patch.label,
  layout: patch.layout
})
assert(fit.fits, 'A4 · 60×40 放得进纸')
const single = sheetPresetPatch(SHEET_PRESETS.find(p => p.name === '单张 60×40'))
assert(single.layout.mode === 'single' && single.layout.cols === 1, '单张规格不排多列')

const overflow = runDiagnostics({
  components: [{ id: 't1', type: 'text', text: '{{品名}}', fontSize: 14, x: 1, y: 1, width: 30, height: 6 }],
  rows: [{ 品名: '有机鸡蛋'.repeat(8) }, { 品名: '盐', __print: false }, { 品名: '有机鸡蛋'.repeat(8) }],
  rowCount: 3,
  label: { width: 60, height: 40 }
})
const issue = overflow.issues.find(i => i.code === 'text-overflow')
assert(issue && issue.fix === 'row' && issue.rowIndex === 0, '超出的字指向那一行')
assert(!String(issue.detail).includes('2'), '没勾的行不进预检')

console.log('sheetPrint ok')
