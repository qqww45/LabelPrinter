import assert from 'node:assert/strict'
import {
  expandTemplateText,
  formatPriceValue,
  fieldRefsFromText
} from '../src/utils/templateExpr.js'
import { renderText, renderTextHtml } from '../src/utils/render.js'
import { escapeHtmlWithBreaks } from '../src/utils/escapeHtml.js'
import { guessCopiesColumn, applyCopiesColumnHint } from '../src/utils/copiesColumn.js'
import { expandPrintLabels, componentPlainText } from '../src/utils/printModel.js'
import { formatSerialText } from '../src/utils/controls.js'
import { collectSceneRowFailures } from '../src/utils/scenePreflight.js'

const row = { __id: '1', 名称: '矿泉水', 规格: '', 价格: '2.5', 份数: 2 }

assert.equal(expandTemplateText('{{名称}}-{{规格}}', row), '矿泉水-')
assert.equal(expandTemplateText('{{join 名称,价格}}', row), '矿泉水 2.5')
assert.equal(expandTemplateText('{{价格|price}}', row), '2.50')
assert.equal(expandTemplateText('{{if 规格|有规格|标准}}', row), '标准')
assert.equal(expandTemplateText('{{hide 规格|规格:{{规格}}}}', row), '')
assert.equal(expandTemplateText('{{ifempty 规格|通用}}', row), '通用')
assert.equal(formatPriceValue('¥12'), '12.00')

const xss = '<img onerror=alert(1) src=x>'
assert.equal(renderText('{{名称}}', { 名称: xss }), xss)
assert.ok(renderTextHtml('{{名称}}', { 名称: xss }).includes('&lt;img'))

assert.deepEqual(fieldRefsFromText('{{if 价格|{{名称}}|}}'), ['价格', '名称'])

assert.equal(guessCopiesColumn(['品名', 'Qty']), 'Qty')
assert.equal(guessCopiesColumn(['品名', '数量']), '')
assert.equal(guessCopiesColumn(['品名', '份数']), '份数')

const store = {
  project: { printConfig: { copiesColumn: '' } },
  markDirty() {}
}
const hit = applyCopiesColumnHint(store, ['名称', '份数'])
assert.equal(hit, '份数')
assert.equal(store.project.printConfig.copiesColumn, '份数')

const labels = expandPrintLabels(
  [{ 名称: 'A', 份数: 2 }, { 名称: 'B', 份数: 1 }],
  { copiesColumn: '份数', copies: 1 }
)
assert.equal(labels.length, 3)

const seqLabels = expandPrintLabels([{ 名称: 'a' }, { 名称: 'b' }], {})
const serial = { type: 'serial', source: 'sequence', start: 10, step: 2, pad: 4, prefix: 'SN' }
assert.equal(formatSerialText(serial, seqLabels[0].row), 'SN0010')
assert.equal(formatSerialText(serial, seqLabels[1].row), 'SN0012')
assert.equal(componentPlainText(serial, seqLabels[1].row), 'SN0012')

const imgFails = collectSceneRowFailures({
  sceneId: '',
  components: [{ type: 'image', source: 'field', binding: '图', id: 'i1' }],
  rows: [{ 图: 'javascript:evil' }],
  fieldMap: {}
})
assert.ok(imgFails.some(f => f.code === 'scene-bad-image-url'))

console.log('p0Features ok')
