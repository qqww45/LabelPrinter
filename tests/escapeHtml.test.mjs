import { escapeHtml, escapeHtmlWithBreaks, safeImageSrc } from '../src/utils/escapeHtml.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(escapeHtml('<img onerror=alert(1)>') === '&lt;img onerror=alert(1)&gt;', 'escape tags')
assert(escapeHtml('a&b') === 'a&amp;b', 'escape amp')
assert(escapeHtmlWithBreaks('a\nb') === 'a<br/>b', 'breaks')
assert(escapeHtmlWithBreaks('<x>\ny') === '&lt;x&gt;<br/>y', 'escape then break')

assert(safeImageSrc('javascript:alert(1)') === '', 'block javascript')
assert(safeImageSrc('data:text/html,<script>') === '', 'block non-image data')
assert(safeImageSrc('data:image/png;base64,xx') === 'data:image/png;base64,xx', 'allow data image')
assert(safeImageSrc('https://cdn.example/a.png') === 'https://cdn.example/a.png', 'allow https')
assert(safeImageSrc('') === '', 'empty')

console.log('escapeHtml.test.mjs: 全部通过')
