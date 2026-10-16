import { tableColumnWidths, tableRowHeights, sizeOffsets } from '../src/utils/tableGeom.js'
import { tableColumnWidths as fromPdf, tableRowHeights as fromPdfRows } from '../src/utils/vectorPdf.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

const sum = xs => xs.reduce((a, b) => a + b, 0)
const near = (a, b) => Math.abs(a - b) < 1e-9

console.log('\n表格几何：画布 / 预览 / PDF 同一套行高列宽')

const colW = tableColumnWidths({ cols: 2, colWidths: [30, 70] }, 100)
check('列宽比例', near(colW[0], 30) && near(colW[1], 70))
check('列宽之和等于总宽', near(sum(colW), 100))

const uneven = tableColumnWidths({ cols: 3, colWidths: [1, 1, 1] }, 100)
check('除不尽时最后一列吃掉余数', near(sum(uneven), 100))
check('列数对不上就等分', tableColumnWidths({ cols: 2, colWidths: [1] }, 80).every(n => near(n, 40)))

const rowH = tableRowHeights({ rows: 2 }, 40)
check('行高均分', rowH.every(n => near(n, 20)))
check('行高之和等于表格高', near(sum(rowH), 40))

const busy = {
  rows: 3,
  cols: 2,
  fontSize: 28,
  cells: {
    '0,0': { type: 'text', text: '很长的品名会换很多行也不该把这一行撑高' },
    '1,1': { type: 'qrcode', text: '6901234567890' },
    '2,0': { type: 'barcode', text: '6901234567890' }
  }
}
const grown = tableRowHeights(busy, 90)
const plain = tableRowHeights({ rows: 3 }, 90)
check('文字和二维码不改变行高', grown.every((n, i) => near(n, plain[i]) && near(n, 30)))
check('三行之和仍是表格高', near(sum(grown), 90))

const MM = 96 / 25.4
const mm = tableRowHeights({ rows: 4 }, 20)
const px = tableRowHeights({ rows: 4 }, 20 * MM)
check('毫米和像素只差同一个比例', mm.every((n, i) => near(px[i] / n, MM)))
check('像素行高之和等于像素总高', near(sum(px), 20 * MM))

const offs = sizeOffsets(grown)
check('网格线起点', near(offs[0], 0) && near(offs[1], 30) && near(offs[2], 60))

check('PDF 复用同一列宽函数', fromPdf === tableColumnWidths)
check('PDF 复用同一行高函数', fromPdfRows === tableRowHeights)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
