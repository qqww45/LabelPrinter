import { renderText, renderTextHtml } from '../src/utils/render.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const row = { 品名: '<b>苹果</b>', 价格: '1&2' }
assert(renderTextHtml('{{品名}}', row).includes('&lt;b&gt;'), 'must escape HTML in values')
assert(renderTextHtml('{{品名}}', row).includes('苹果'), 'must render field')
assert(renderTextHtml('{{价格}}', row).includes('1&amp;2'), 'must escape ampersand')
assert(renderText('{{品名}}', row) === '<b>苹果</b>', 'plain render unchanged for PDF path')

console.log('renderTextHtml ok')
