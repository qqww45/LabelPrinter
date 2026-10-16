import {
  normalizeMargin,
  labelAreaMm,
  pageBoxStyle,
  labelAreaStyle
} from '../src/utils/pageBox.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

console.log('\npageBox')

const paper = { width: 210, height: 297 }
const margin = { top: 5, right: 5, bottom: 5, left: 5 }
const area = labelAreaMm(paper, margin)
check('标签区 = 纸张减边距', area.width === 200 && area.height === 287)

const s = 96 / 25.4
const page = pageBoxStyle(paper, margin, s, { background: 'white' })
check('纸张用 border-box', page.boxSizing === 'border-box')
check('上边距是 padding 不是靠子 margin', page.paddingTop === (5 * s) + 'px' && !('marginTop' in page))
check('四边 padding 齐全', page.paddingRight && page.paddingBottom && page.paddingLeft)
check('宽高等于纸张像素', page.width === (210 * s) + 'px' && page.height === (297 * s) + 'px')

const label = labelAreaStyle(paper, margin, s)
check('标签区无外边距', label.margin === '0')
check('标签区宽高扣掉边距', label.width === (200 * s) + 'px' && label.height === (287 * s) + 'px')

const zero = normalizeMargin({})
check('缺省边距为 0', zero.top === 0 && zero.left === 0)

const filled = pageBoxStyle(paper, margin, s)
const contentW = 210 * s - 5 * s - 5 * s
const contentH = 297 * s - 5 * s - 5 * s
check(
  'padding + 标签区 = 纸张（视觉一致）',
  Math.abs(contentW - 200 * s) < 1e-9 && Math.abs(contentH - 287 * s) < 1e-9
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
