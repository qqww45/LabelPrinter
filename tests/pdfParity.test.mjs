/**
 * PDF 输出一致性：颜色解析、拉丁/中文分流、表格字色约定。
 * 不启动 jsPDF 画布，只锁住会让「红价签变黑」的回归点。
 */
import {
  textNeedsOutlineFont,
  rgb,
  tableColumnWidths,
  tableRowHeights
} from '../src/utils/vectorPdf.js'
import { renderText, codePayload } from '../src/utils/render.js'
import { componentHidden, expandPrintLabels, paginateLabels } from '../src/utils/printModel.js'
import { safeImageSrc, escapeHtmlWithBreaks } from '../src/utils/escapeHtml.js'

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}`) }
}

console.log('== PDF 颜色与字体分流 ==')
check('红价签 #d0021b → RGB', rgb('#d0021b').join(',') === '208,2,27')
check('短 hex #f00 → 255,0,0', rgb('#f00').join(',') === '255,0,0')
check('rgb() 可解析', rgb('rgb(208, 2, 27)').join(',') === '208,2,27')
check('价格 2.00 走拉丁矢量字', textNeedsOutlineFont('2.00') === false)
check('矿泉水走中文描边小图', textNeedsOutlineFont('矿泉水') === true)
check('¥2.00 因符号走中文路径', textNeedsOutlineFont('¥2.00') === true)
check('纯英文仍走拉丁', textNeedsOutlineFont('SKU-001') === false)

console.log('== 价签数据绑定（模板语义） ==')
const row = { 品名: '矿泉水', 价格: '2.00', 条码: '6901234567890' }
check('品名占位', renderText('{{品名}}', row) === '矿泉水')
check('价格占位仍是拉丁数字', renderText('{{价格}}', row) === '2.00')
check('价格渲染后仍判定为拉丁字', textNeedsOutlineFont(renderText('{{价格}}', row)) === false)
check('二维码用条码字段', codePayload({ binding: '条码', text: 'QR' }, row) === '6901234567890')

console.log('== 预览 HTML 与图片白名单（不改版式） ==')
const xss = '<img src=x onerror=alert(1)>'
check('价签混排转义', escapeHtmlWithBreaks(renderText('{{品名}}', { 品名: xss, __id: '1' })).includes('&lt;img'))
check('拦截 javascript 图源', safeImageSrc('javascript:alert(1)') === '')
check('保留 https 图源', safeImageSrc('https://cdn.example/a.png').startsWith('https://'))

console.log('== 拼版与隐藏（输出页数稳定） ==')
const labels = expandPrintLabels(
  [row, { 品名: '可乐', 价格: '3.50', 条码: '1' }],
  { copies: 1 }
)
check('两行 → 两张标签', labels.length === 2)
const pages = paginateLabels(labels, 1)
check('每页 1 张 → 2 页', pages.length === 2)
check('空绑定隐藏', componentHidden({ type: 'qrcode', binding: '条码', hideIfEmpty: true }, { 条码: '' }) === true)
check('有值不隐藏', componentHidden({ type: 'qrcode', binding: '条码', hideIfEmpty: true }, row) === false)

console.log('== 表格几何（PDF 表格不漂） ==')
const colW = tableColumnWidths({ cols: 2, colWidths: [30, 70] }, 100)
check('列宽比例', Math.abs(colW[0] - 30) < 0.01 && Math.abs(colW[1] - 70) < 0.01)
const rowH = tableRowHeights({ rows: 2 }, 40)
check('行高均分', rowH.every(n => Math.abs(n - 20) < 0.01))

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
if (fail) process.exit(1)
