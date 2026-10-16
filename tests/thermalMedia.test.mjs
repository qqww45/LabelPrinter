import {
  normalizeMedia,
  mediaLookPreset,
  applyMediaLook,
  isThermalTrouble,
  MEDIA_LOOKS
} from '../src/utils/thermalMedia.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

console.log('\nthermalMedia')

check('三种看纸预设', MEDIA_LOOKS.length === 3)
check('未知 media 归一为 gap', normalizeMedia('foo') === 'gap' && normalizeMedia(null) === 'gap')
check('间隙默认 2mm', mediaLookPreset('gap').gapMm === 2)
check('黑标默认 3mm', mediaLookPreset('mark').gapMm === 3)
check('连续纸间隙 0', mediaLookPreset('continuous').gapMm === 0)

check(
  '选连续纸强制 gap 0',
  applyMediaLook('continuous', { media: 'gap', gapMm: 2 }).gapMm === 0
)

const fromCont = applyMediaLook('gap', { media: 'continuous', gapMm: 0 })
check('从连续纸切回间隙用默认 2', fromCont.media === 'gap' && fromCont.gapMm === 2)

const keep = applyMediaLook('mark', { media: 'gap', gapMm: 2.5 })
check('间隙改黑标保留已调间隙', keep.media === 'mark' && keep.gapMm === 2.5)

check('症状 id 白名单', isThermalTrouble('blank') && !isThermalTrouble('other'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
