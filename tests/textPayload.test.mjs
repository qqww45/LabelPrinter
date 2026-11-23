import { textPayload, designTextWithAlert, renderTextComponentHtml, codePayload } from '../src/utils/render.js'
import { componentPlainText } from '../src/utils/printModel.js'
import { TEXT_SNIPPETS } from '../src/utils/textSnippets.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg) }
  else { failed++; console.error('  ✗', msg) }
}

console.log('textPayload / data bind render paths')

const row = { 规格: '5kg', 名称: '东北大米', 条码: '6901234567890' }

// 用户报告的回归：field 模式 + 静态残留文案
assert(
  textPayload({ type: 'text', dataMode: 'field', binding: '规格', text: '东北大米' }, row) === '5kg',
  'field bind ignores stale static text'
)

// 旧模板：无 dataMode，text 含 {{}}
assert(
  textPayload({ type: 'text', binding: '名称', text: '品名：{{名称}}' }, row) === '品名：东北大米',
  'legacy binding + {{}} template unchanged'
)

assert(textPayload({ dataMode: 'fixed', text: '固定 {{名称}}' }, row) === '固定 东北大米', 'fixed + expression')
assert(
  textPayload({ dataMode: 'fixed', text: '只读' }, row) === '只读',
  'fixed literal'
)

assert(
  codePayload({ dataMode: 'field', binding: '条码', text: 'QR' }, row) === '6901234567890',
  'barcode field bind still via codePayload'
)

assert(
  componentPlainText({ type: 'text', dataMode: 'field', binding: '规格', text: '东北大米' }, row) === '5kg',
  'print plain text uses textPayload'
)

assert(
  designTextWithAlert({ dataMode: 'field', binding: '规格', text: '东北大米' }, row, new Set(['规格', '名称'])).text === '5kg',
  'canvas designTextWithAlert field'
)

assert(
  designTextWithAlert({ dataMode: 'field', binding: '缺列', text: 'x' }, row, new Set(['规格'])).text.startsWith('⚠'),
  'canvas warns missing column'
)

assert(
  textPayload({ dataMode: 'field', binding: '规格', text: '' }, {}) === '{{规格}}',
  'empty row keeps placeholder'
)

assert(
  codePayload({ dataMode: 'serial', prefix: 'T', pad: 3, start: 1, step: 1, serialSource: 'sequence' }, { __labelIndex: 2 }) === 'T003',
  'text serial via codePayload branch'
)
assert(
  textPayload({ dataMode: 'serial', prefix: 'T', pad: 3, start: 1, step: 1, serialSource: 'sequence' }, { __labelIndex: 2 }) === 'T003',
  'text serial mode'
)

assert(renderTextComponentHtml({ dataMode: 'field', binding: '名称', text: 'x' }, row).includes('东北大米'), 'preview html escapes field value')

const brands = ['bartender', 'bartendersoftware', 'codesoft', 'nicelabel', 'labelmx', 'seagull']
for (const s of TEXT_SNIPPETS || []) {
  const low = String(s.text || s).toLowerCase()
  assert(!brands.some(b => low.includes(b)), `snippet free of competitor names: ${low.slice(0, 20)}`)
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)