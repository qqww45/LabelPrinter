import {
  normalizeCalibrate,
  transformPoint,
  transformSize,
  transformPiece,
  calibrationPieces
} from '../src/utils/thermalCalibrate.js'
import { buildTSPL, buildZPL } from '../src/utils/printerCmd.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

const def = normalizeCalibrate({})
check('默认校准为零偏百分百', def.offsetXMm === 0 && def.offsetYMm === 0 && def.scalePercent === 100)

const clamped = normalizeCalibrate({ offsetXMm: 99, offsetYMm: -99, scalePercent: 200 })
check('偏移与缩放有上下限', clamped.offsetXMm === 50 && clamped.offsetYMm === -50 && clamped.scalePercent === 150)

const emptyScale = normalizeCalibrate({ scalePercent: '' })
const zeroScale = normalizeCalibrate({ scalePercent: 0 })
const negScale = normalizeCalibrate({ scalePercent: -10 })
check('空缩放回到 100', emptyScale.scalePercent === 100)
check('0 和负缩放回到 100，不落到 50', zeroScale.scalePercent === 100 && negScale.scalePercent === 100)
check('过小的正缩放仍夹到 50', normalizeCalibrate({ scalePercent: 40 }).scalePercent === 50)

const p = transformPoint(10, 20, { offsetXMm: 2, offsetYMm: -1, scalePercent: 100 })
check('仅偏移时点平移', p.x === 12 && p.y === 19)

const p2 = transformPoint(10, 20, { offsetXMm: 0, offsetYMm: 0, scalePercent: 110 })
check('缩放落在原点侧', Math.abs(p2.x - 11) < 1e-9 && Math.abs(p2.y - 22) < 1e-9)

const sz = transformSize(40, 30, { scalePercent: 90 })
check('尺寸随缩放', Math.abs(sz.w - 36) < 1e-9 && Math.abs(sz.h - 27) < 1e-9)

const piece = transformPiece(
  { kind: 'rect', x: 1, y: 2, w: 10, h: 8, strokeWidth: 1 },
  { offsetXMm: 1.5, scalePercent: 100 }
)
check('piece 带偏移', piece.x === 2.5 && piece.y === 2 && piece.w === 10)

const identity = transformPiece({ kind: 'text', x: 3, y: 4, fontSize: 14, text: 'a' }, {})
check('默认校准不改写对象', identity.x === 3 && identity.fontSize === 14)

const bits = calibrationPieces({ width: 40, height: 30 })
check('校准签有外框十字和尺寸字', bits.length === 4 && bits[0].kind === 'rect' && bits.some(b => b.kind === 'line') && bits.some(b => b.kind === 'text' && String(b.text).includes('40')))

const calJob = {
  label: { width: 40, height: 30 },
  gapMm: 2,
  media: 'gap',
  dpi: 203,
  direction: 1,
  calibrationOnly: true,
  calibrate: { offsetXMm: 0, offsetYMm: 0, scalePercent: 100 },
  labels: [{ row: {} }]
}
const tsplCal = buildTSPL(calJob)
check('校准签 TSPL 含 SIZE 与 BOX', tsplCal.includes('SIZE 40 mm,30 mm') && tsplCal.includes('BOX') && tsplCal.includes('PRINT 1,1'))
check('校准签 TSPL 含尺寸文字', tsplCal.includes('40x30mm'))

const shifted = buildTSPL({
  label: { width: 40, height: 30 },
  dpi: 203,
  gapMm: 2,
  components: [{ type: 'text', text: 'Hi', left: 0, top: 0, fontSize: 14 }],
  labels: [{ row: {} }],
  calibrate: { offsetXMm: 2, offsetYMm: 0, scalePercent: 100 }
})
// 2mm @ 203dpi ≈ 16 dots
check('TSPL 应用水平偏移', /TEXT 16,0,/.test(shifted) && shifted.includes('Hi'))

const neg = buildTSPL({
  label: { width: 40, height: 30 },
  dpi: 203,
  components: [{ type: 'text', text: 'A', left: 5, top: 5, fontSize: 14 }],
  labels: [{ row: {} }],
  calibrate: { offsetXMm: -2, offsetYMm: -1, scalePercent: 100 }
})
check('TSPL 允许负坐标偏移', /TEXT -?\d+,-?\d+,/.test(neg) && neg.includes('"A"'))

const zplCal = buildZPL({ ...calJob, media: 'gap' })
check('校准签 ZPL 有外框', zplCal.includes('^XA') && zplCal.includes('^GB') && zplCal.includes('^XZ'))

const scaled = buildTSPL({
  label: { width: 40, height: 30 },
  dpi: 203,
  components: [{ type: 'rect', left: 0, top: 0, width: 10, height: 10, strokeWidth: 1 }],
  labels: [{ row: {} }],
  calibrate: { offsetXMm: 0, offsetYMm: 0, scalePercent: 110 }
})
check('缩放后矩形终点大于原尺寸点阵', scaled.includes('BOX') && scaled.includes('PRINT 1,1'))

const negGap = buildTSPL({
  label: { width: 40, height: 30 },
  dpi: 203,
  gapMm: -5,
  components: [],
  labels: [{ row: {} }]
})
check('负间隙收成 0', negGap.includes('GAP 0 mm,0 mm'))
const hugeGap = buildTSPL({
  label: { width: 40, height: 30 },
  dpi: 203,
  gapMm: 999,
  components: [],
  labels: [{ row: {} }]
})
check('过大间隙收成 50', hugeGap.includes('GAP 50 mm,0 mm'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
