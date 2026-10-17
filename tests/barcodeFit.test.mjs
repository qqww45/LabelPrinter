import { barcodeBarHeight, barcodeFontSize, barcodeModuleWidth, barcodePrintPx } from '../src/utils/barcodeFit.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(barcodeModuleWidth(40, 0) === 2, '没有目标宽度时用 2px')
const short = barcodeModuleWidth(40, 400)
const long = barcodeModuleWidth(120, 400)
assert(short > long, '同样宽度下，短码的条更粗')
assert(short >= 1 && Number.isInteger(short), '条宽是正整数')
assert(barcodeFontSize(0) === 14, '没有高度时字号保持 14')
assert(barcodeFontSize(200) > barcodeFontSize(80), '格子越高，数字越大')
assert(barcodeFontSize(200) <= 64, '字号有上限')
assert(barcodeFontSize(200, 0.4) > barcodeFontSize(200, 0.12), '数字比例越大，字越大')
const bars = barcodeBarHeight(120, 26, 4, true)
assert(bars >= 8, '条的高度至少留得住')
assert(bars < 120, '数字和空白从高度里扣掉')
assert(barcodePrintPx(25.4) === 300, '一英寸按 300 像素画')

console.log('barcodeFit ok')
