import { MM_TO_PX } from '../src/utils/canvasFit.js'
import { heightForFont, minTextHeightMm } from '../src/utils/textFit.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const oneLine = minTextHeightMm(14)
const px = 14 * 1.2 + 14 * 0.15
assert(Math.abs(oneLine - Math.round((px / MM_TO_PX) * 100) / 100) < 0.001, '一行高度含下沿')
assert(minTextHeightMm(20) > minTextHeightMm(12), '字号越大，最少高度越高')
assert(minTextHeightMm(12, 2) > minTextHeightMm(12, 1), '两行比一行高')

const grown = heightForFont(2, 18)
assert(grown === minTextHeightMm(18), '框比一行字矮时加高')
assert(heightForFont(40, 12) === 40, '已经够高的框不改')
assert(heightForFont(0, 10) === minTextHeightMm(10), '没有高度时按一行补上')

console.log('textFit ok')
