import assert from 'node:assert/strict'
import {
  STYLE_KEYS,
  extractStyle,
  copyStyleFrom,
  canPasteStyleTo,
  stylePatchFor,
  styleClipboard,
  clearStyleClipboard
} from '../src/utils/styleClipboard.js'

clearStyleClipboard()

assert.ok(STYLE_KEYS.includes('fontSize'))
assert.ok(STYLE_KEYS.includes('fill'))
assert.equal(extractStyle(null), null)
assert.equal(extractStyle({ type: 'text', left: 1, top: 2 }), null)

const text = { type: 'text', left: 10, top: 20, fontSize: 12, fill: '#f00', binding: '名' }
const style = extractStyle(text)
assert.deepEqual(style, { fontSize: 12, fill: '#f00' })
assert.ok(!('left' in style))
assert.ok(!('binding' in style))

assert.equal(copyStyleFrom(text, '标题'), 'ok')
assert.equal(styleClipboard.value.type, 'text')
assert.equal(styleClipboard.value.sourceName, '标题')
assert.equal(canPasteStyleTo({ type: 'text' }), true)
assert.equal(canPasteStyleTo({ type: 'barcode' }), false)
assert.deepEqual(stylePatchFor({ type: 'text' }), { fontSize: 12, fill: '#f00' })
assert.equal(stylePatchFor({ type: 'image' }), null)

assert.equal(copyStyleFrom({ type: 'line', left: 0 }, '线'), 'empty')

clearStyleClipboard()
assert.equal(styleClipboard.value, null)
assert.equal(canPasteStyleTo({ type: 'text' }), false)

console.log('styleClipboard.test.mjs: ok')
