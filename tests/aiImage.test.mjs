import { visionCanvasSize, visionCalibrateHint, isVisionImageFile } from '../src/utils/aiImage.js'
import { buildAdjustMessages } from '../src/utils/ai.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

const small = visionCanvasSize(800, 600, 1280)
check('小于上限不放大', small.width === 800 && small.height === 600 && small.scale === 1)

const big = visionCanvasSize(4000, 2000, 1280)
check('长边压到 1280', big.width === 1280 && big.height === 640)

check('jpg 文件名可识别', isVisionImageFile({ name: 'a.JPG', type: '' }) === true)
check('非图片拒绝', isVisionImageFile({ name: 'a.pdf', type: 'application/pdf' }) === false)

const hint = visionCalibrateHint({ width: 40, height: 30 })
check('提示含尺寸与校准字段', hint.includes('40×30') && hint.includes('offsetXMm') && hint.includes('scalePercent'))

const msgs = buildAdjustMessages('sys', [], '纠偏', {
  imageDataUrl: 'data:image/jpeg;base64,abc'
})
const user = msgs[msgs.length - 1]
check('带图时 user content 是数组', Array.isArray(user.content) && user.content[0].type === 'text')
check('带图含 image_url', user.content[1]?.type === 'image_url' && user.content[1].image_url.url.startsWith('data:image/jpeg'))

const plain = buildAdjustMessages('sys', [{ role: 'user', text: 'hi' }], '再试')
check('无图仍是纯文本', typeof plain[plain.length - 1].content === 'string')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
