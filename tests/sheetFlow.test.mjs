import { barcodeScanIssue, barcodeScanText } from '../src/utils/barcodeScan.js'
import { matchColumns } from '../src/utils/columnMatch.js'
import { pageForSourceRow } from '../src/utils/printModel.js'
import { runDiagnostics } from '../src/utils/diagnose.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(barcodeScanIssue({ format: 'EAN13', value: '6901234567892' }) === 'ok', '合法 EAN-13')
assert(barcodeScanIssue({ format: 'EAN13', value: '690123456789' }) === 'ean13', '位数不够')
assert(barcodeScanIssue({ format: 'EAN13', value: '6901234567891' }) === 'ean-check', '校验位不对')
assert(barcodeScanIssue({ format: 'CODE128', value: '' }) === 'empty', '空值')
assert(barcodeScanIssue({ format: 'CODE39', value: 'ab' }) === 'code39', '小写不行')
assert(barcodeScanIssue({ format: 'CODE128', value: '23', heightMm: 4 }) === 'short', '格子太矮')
assert(barcodeScanIssue({ format: 'CODE128', value: '12345678', widthMm: 8 }) === 'narrow', '格子偏窄')
assert(barcodeScanIssue({ format: 'CODE128', value: '6901234567892', widthMm: 46, heightMm: 12 }) === 'ok', '普通价签不误报')
assert(barcodeScanText('ean13').includes('13'), '提示能对上格式')

const hit = matchColumns(['品名', '价格', '备注'], ['品名', '货位'], { 货位: '价格' })
assert(hit.matched.join() === '品名,货位', '映射上的列算对上')
assert(hit.missing.length === 0, '映射后没有缺列')
assert(hit.extra.join() === '备注', '没被版式用到的列算多出来')
const miss = matchColumns(['品名'], ['品名', '条码'])
assert(miss.missing.join() === '条码', '新表缺的列点得出来')

const labels = [
  { sourceIndex: 0 },
  { sourceIndex: 0 },
  { sourceIndex: 1 }
]
assert(pageForSourceRow(labels, 1, 2) === 2, '份数展开后仍落到那一行的页')
assert(pageForSourceRow([{ row: {} }], 0, 1) === 1, '空标签停在第一页')

const empty = runDiagnostics({
  components: [{ id: 'b1', type: 'barcode', binding: '条码', format: 'CODE128', x: 1, y: 1, width: 40, height: 12 }],
  rows: [{ 条码: '6901234567890' }, { 条码: '' }],
  rowCount: 2,
  label: { width: 60, height: 40 }
})
const issue = empty.issues.find(i => i.code === 'empty-code')
assert(issue && issue.fix === 'row' && issue.rowIndex === 1 && issue.ids[0] === 'b1', '空条码指向那一行')

const skipped = runDiagnostics({
  components: [{ id: 't1', type: 'text', text: '固定', x: 1, y: 1, width: 20, height: 8 }],
  rowCount: 5,
  label: { width: 60, height: 40 }
})
assert(!skipped.issues.some(i => i.code === 'empty-code'), '没传行时不报空条码')

const hidden = runDiagnostics({
  components: [{ id: 'b2', type: 'barcode', binding: '条码', hideIfEmpty: true, x: 1, y: 1, width: 40, height: 12 }],
  rows: [{ 条码: '' }],
  rowCount: 1,
  label: { width: 60, height: 40 }
})
assert(!hidden.issues.some(i => i.code === 'empty-code'), '空了不印的条码不报扫不了')

console.log('sheetFlow ok')
