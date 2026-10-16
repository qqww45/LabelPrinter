import { expandPrintLabels, paginateLabels, componentHidden, slotOffsetMm } from '../src/utils/printModel.js'
import { buildTSPL, buildZPL } from '../src/utils/printerCmd.js'
import { qrMatrix } from '../src/utils/codeGeom.js'
import { textNeedsOutlineFont, tableColumnWidths, tableRowHeights, rgb } from '../src/utils/vectorPdf.js'
import { runDiagnostics } from '../src/utils/diagnose.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

const a = { __id: 'a', 名称: '牛奶', 份数: 2 }
const b = { __id: 'b', 名称: '面包', 份数: 0 }
const c = { __id: 'c', 名称: '饼干', 份数: 1 }

const one = expandPrintLabels([], { copies: 3, serialEnabled: true })
check('没数据只留一张空标签', one.length === 1 && !('序号' in one[0].row))

const doubled = expandPrintLabels([a, c], { copies: 2, serialEnabled: true, serialStart: 5, collate: true })
check('整单 2 份、逐份：顺序是两套', doubled.map(x => x.row.名称).join(',') === '牛奶,饼干,牛奶,饼干')
check('序号按张递增且不改原行', doubled.map(x => x.row.序号).join(',') === '5,6,7,8' && a.序号 == null)

const stacked = expandPrintLabels([a, c], { copies: 2, collate: false, serialEnabled: true })
check('不逐份时同一条连打', stacked.map(x => x.row.名称).join(',') === '牛奶,牛奶,饼干,饼干')
const omitted = expandPrintLabels([a, c], { copies: 2 })
check('没写逐份时也是每条连打', omitted.map(x => x.row.名称).join(',') === '牛奶,牛奶,饼干,饼干')

const byCol = expandPrintLabels([a, b, c], { copies: 4, copiesColumn: '份数', serialEnabled: true })
check('按列份数，0 跳过，不再乘整单份数', byCol.map(x => x.row.名称).join(',') === '牛奶,牛奶,饼干')
check('跳过的行不占序号', byCol.map(x => x.serial).join(',') === '1,2,3')

const pages = paginateLabels(byCol, 2)
check('3 张每页 2 个 → 2 页，末格空', pages.length === 2 && pages[1].slots[1].empty === true && pages[0].slots.length === 2)

const origin = slotOffsetMm(1, {
  label: { width: 40, height: 30 },
  margin: { left: 5, top: 8 },
  layout: { mode: 'auto', cols: 2, rows: 2, hGap: 2, vGap: 3 }
})
check('第二格水平错开一个标签加间隙', origin.x === 47 && origin.y === 8)

check('没数据不隐藏', componentHidden({ hideIfEmpty: true, type: 'text', binding: '名称' }, {}) === false)
check('绑定为空就隐藏', componentHidden({ hideIfEmpty: true, type: 'text', binding: '名称' }, { 名称: '  ' }) === true)
check('占位符渲染空也隐藏', componentHidden({ hideIfEmpty: true, type: 'text', text: '{{名称}}' }, { 名称: '' }) === true)
check('没勾选不隐藏', componentHidden({ type: 'text', binding: '名称' }, { 名称: '' }) === false)
check('手动隐藏后画布和打印都不出', componentHidden({ hidden: true, type: 'text', text: '价格' }, { 名称: '牛奶' }) === true)
check('有内容不隐藏', componentHidden({ hideIfEmpty: true, type: 'qrcode', binding: '码' }, { 码: 'ABC' }) === false)

const comps = [
  { type: 'text', text: '价:{{名称}}', left: 2, top: 3, fontSize: 14 },
  { type: 'text', text: '{{空列}}', left: 2, top: 10, hideIfEmpty: true },
  { type: 'barcode', binding: '码', text: 'QR', left: 2, top: 16, width: 30, height: 10 },
  { type: 'rect', left: 1, top: 1, width: 20, height: 8, strokeWidth: 1 }
]
const tspl = buildTSPL({
  label: { width: 40, height: 30 },
  gapMm: 3,
  media: 'gap',
  dpi: 203,
  direction: 1,
  components: comps,
  labels: [{ row: { 名称: '牛奶', 空列: '', 码: '6901' } }]
})
check('TSPL 有尺寸、间隙和打印', tspl.includes('SIZE 40 mm,30 mm') && tspl.includes('GAP 3 mm,0 mm') && tspl.includes('PRINT 1,1'))
check('TSPL 写入内容并跳过空字段', tspl.includes('牛奶') && !tspl.includes('空列'))
check('TSPL 条码用字段值而不是静态 QR', tspl.includes('6901') && tspl.includes('BARCODE'))

const zpl = buildZPL({
  label: { width: 50, height: 30 },
  media: 'mark',
  dpi: 203,
  direction: 0,
  components: comps,
  labels: [{ row: { 名称: '牛奶', 空列: '', 码: '6901' } }]
})
check('ZPL 黑标、UTF-8、反向', zpl.includes('^XA') && zpl.includes('^CI28') && zpl.includes('^MNM') && zpl.includes('^POI') && zpl.includes('^XZ'))
check('ZPL 含文本和条码', zpl.includes('牛奶') && zpl.includes('^BCN') && zpl.includes('6901'))

const mark = buildTSPL({ label: { width: 40, height: 30 }, media: 'mark', gapMm: 2, components: [], labels: [{ row: {} }] })
check('黑标走 BLINE', mark.includes('BLINE 2 mm,0 mm') && !mark.includes('GAP'))

const matrix = qrMatrix('6901234567890')
check('二维码矩阵是方的且有黑块', matrix.length > 10 && matrix.length === matrix[0].length && matrix.some(row => row.includes(1)))

const diag = runDiagnostics({
  components: [{ type: 'text', text: 'x' }],
  dataFields: ['名称'],
  rowCount: 2,
  rows: [{ 名称: '甲' }, { 名称: '乙' }],
  perPage: 1,
  printConfig: { copies: 3 },
  label: { width: 40, height: 30 },
  paper: { width: 40, height: 30 }
})
check('体检页数已经乘上份数', diag.summary.pages === 6 && diag.summary.copies === 1)
check('中文和人民币符号不走英文字体', textNeedsOutlineFont('矿泉水') && textNeedsOutlineFont('¥2.00') && textNeedsOutlineFont('￥9.9'))
check('纯英文数字仍走矢量字', textNeedsOutlineFont('550ml') === false && textNeedsOutlineFont('2026-10-01') === false)
check('红色价签色值可解析', rgb('#d0021b').join(',') === '208,2,27')
check('价格 2.00 走拉丁矢量字（须用 setTextColor）', textNeedsOutlineFont('2.00') === false)
const colW = tableColumnWidths({ cols: 2, colWidths: [40, 60] }, 100)
check('列宽按比例', Math.abs(colW[0] - 40) < 0.01 && Math.abs(colW[1] - 60) < 0.01)
const rowH = tableRowHeights({
  rows: 3, cols: 2,
  cells: { '1,1': { type: 'qrcode' } }
}, 90)
check('二维码不改变行高', rowH.every(n => Math.abs(n - 30) < 0.01))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
