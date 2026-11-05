/**
 * 新增控件：序号 / 勾选框 / 隐藏逻辑（纯函数）
 */
import { isTruthyField, formatSerialText, formatCheckboxText, formatPriceText, strokeStyleDash, barcodeCanvasOptions, EMPTY_PRICE_DISPLAY } from '../src/utils/controls.js'
import { componentHidden, componentPlainText, expandPrintLabels } from '../src/utils/printModel.js'
import { validateAndNormalize } from '../src/utils/ai.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg) }
  else { failed++; console.error('  ✗', msg) }
}

console.log('controls / serial / checkbox')

assert(isTruthyField('1') && isTruthyField('是') && isTruthyField('Y'), 'truthy values')
assert(!isTruthyField('') && !isTruthyField('0') && !isTruthyField('否') && !isTruthyField(null), 'falsy values')

assert(formatSerialText({ pad: 4, prefix: 'NO.' }, {}) === 'NO.0001', 'empty row shows sample padded serial')
assert(formatSerialText({ pad: 4, prefix: 'NO.' }, { 序号: '7' }) === 'NO.0007', 'print serial pad')
assert(formatSerialText({ source: 'field', binding: '批次', pad: 3 }, { 批次: '12' }) === '012', 'field serial')
assert(formatSerialText({ source: 'print', pad: 4 }, { 名称: 'x' }) === '', 'no 序号 → empty')

assert(formatCheckboxText({ binding: '已检' }, {}) === '☐', 'empty row unchecked')
assert(formatCheckboxText({ binding: '已检' }, { 已检: '1' }) === '☑', 'checked')
assert(formatCheckboxText({ binding: '已检' }, { 已检: '否' }) === '☐', 'unchecked 否')
assert(formatCheckboxText({ binding: '状态', checkedValue: '合格' }, { 状态: '合格' }) === '☑', 'checkedValue match')
assert(formatCheckboxText({ binding: '状态', checkedValue: '合格' }, { 状态: '不合格' }) === '☐', 'checkedValue miss')

assert(formatPriceText({ currency: '¥', decimals: 2, binding: '价格' }, {}) === '¥12.80', 'price sample row')
assert(formatPriceText({ currency: '¥', decimals: 2, binding: '价格' }, { 价格: '9.5' }) === '¥9.50', 'price format')
assert(formatPriceText({ binding: '价格' }, { 价格: '' }) === EMPTY_PRICE_DISPLAY, 'price empty')
assert(strokeStyleDash('dashed')?.length === 2, 'dashed dash')
assert(strokeStyleDash('solid') === null, 'solid dash')
assert(barcodeCanvasOptions({ displayValue: false }, 100, 50).displayValue === false, 'barcode opts displayValue')
assert(barcodeCanvasOptions({}, 100, 50).displayValue === true, 'barcode opts default displayValue')

const serial = { type: 'serial', source: 'print', pad: 4, hideIfEmpty: true }
assert(!componentHidden(serial, {}), 'empty row: serial still visible for layout')
assert(componentHidden(serial, { 名称: 'a' }), 'no 序号 + hideIfEmpty → hidden')
assert(!componentHidden(serial, { 序号: '3' }), 'has 序号 → show')
assert(componentPlainText(serial, { 序号: '3' }) === '0003', 'plain serial')

const box = { type: 'checkbox', binding: '已检', hideIfEmpty: true }
assert(!componentHidden(box, { 已检: '1' }), 'checkbox with value')
assert(componentHidden(box, { 已检: '' }), 'checkbox empty + hide')
assert(componentPlainText({ type: 'checkbox', binding: '已检' }, { 已检: 'Y' }) === '☑', 'plain checkbox')

const price = { type: 'price', binding: '价格', hideIfEmpty: true, decimals: 2 }
assert(componentPlainText(price, { 价格: '3' }) === '¥3.00', 'plain price')
assert(componentHidden(price, { 价格: '' }), 'price empty hide')

const labels = expandPrintLabels([{ 名称: 'a' }, { 名称: 'b' }], { serialEnabled: true, serialStart: 1 })
assert(componentPlainText(serial, labels[1].row) === '0002', 'serial follows expandPrintLabels')

const { components, warnings } = validateAndNormalize([
  { type: 'ellipse', name: '圆', left: 1, top: 1, width: 10, height: 8, fill: 'transparent', stroke: '#000' },
  { type: 'serial', name: '号', left: 2, top: 2, width: 20, height: 6, pad: 4, source: 'print' },
  { type: 'checkbox', name: '检', left: 3, top: 3, width: 6, height: 6, binding: '已检' },
  { type: 'price', name: '价', left: 4, top: 4, width: 20, height: 8, binding: '价格' },
  { type: 'divider', name: '线', left: 0, top: 30, width: 50, height: 0.5, direction: 'horizontal' },
  { type: 'dashedBox', name: '框', left: 5, top: 5, width: 30, height: 15, strokeStyle: 'dashed' },
  { type: 'unknown_x', left: 0, top: 0, width: 1, height: 1 }
], { labelWidth: 60, labelHeight: 40, fields: ['已检', '价格'] })

assert(components.length === 6, 'AI normalize keeps new types')
assert(components.some(c => c.type === 'ellipse'), 'ellipse ok')
assert(components.find(c => c.type === 'serial')?.pad === 4, 'serial pad kept')
assert(components.find(c => c.type === 'checkbox')?.binding === '已检', 'checkbox binding kept')
assert(components.find(c => c.type === 'price')?.decimals === 2, 'price decimals')
assert(components.find(c => c.type === 'dashedBox')?.strokeStyle === 'dashed', 'dashedBox style')
assert(warnings.some(w => /跳过|不合法/.test(w)), 'unknown type skipped with warning')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
