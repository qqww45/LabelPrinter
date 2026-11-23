import { normalizeDataMode, parseBatchLines, applyBatchListToTable } from '../src/utils/dataBindModes.js'
import { codePayload } from '../src/utils/render.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg) }
  else { failed++; console.error('  ✗', msg) }
}

console.log('dataBindModes')

assert(normalizeDataMode({ dataMode: 'batch' }) === 'batch', 'normalize batch')
assert(normalizeDataMode({ binding: '条码' }) === 'field', 'binding → field')
assert(parseBatchLines('a\n\nb\n').length === 2, 'parse lines')

const r = applyBatchListToTable({
  headers: ['名称'],
  rows: [{ __id: '1', 名称: 'x' }],
  columnName: '',
  lines: '1001\n1002\n1003',
  makeRowId: () => 'new'
})
assert(r.column === '批量数据', 'auto column')
assert(r.rows.length === 3, 'rows padded')
assert(r.rows[2][r.column] === '1003', 'values applied')

assert(codePayload({ dataMode: 'fixed', text: 'ABC' }, {}) === 'ABC', 'fixed payload')
assert(codePayload({ dataMode: 'field', binding: '码', text: 'x' }, { 码: '9' }) === '9', 'field payload')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)