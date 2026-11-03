import { mergeDataByKey, guessMergeKey } from '../src/utils/dataMerge.js'
import { headersSignature, lookupSavedFieldMap, rememberFieldMap, sanitizeFieldMapForHeaders } from '../src/utils/fieldMapMemory.js'
import { collectSceneRowFailures } from '../src/utils/scenePreflight.js'
import { getEffectiveCalibrate } from '../src/utils/effectiveCalibrate.js'
import { normalizeCalibrate } from '../src/utils/thermalCalibrate.js'

function check(name, ok) {
  if (!ok) {
    console.error('FAIL:', name)
    process.exitCode = 1
  } else {
    console.log('ok:', name)
  }
}

const merged = mergeDataByKey(
  ['条码', '品名'],
  [{ 条码: 'A1', 品名: '旧' }],
  ['条码', '品名', '价格'],
  [{ 条码: 'A1', 品名: '新', 价格: '9.9' }],
  '条码'
)
check('同条码更新品名与价格', merged.rows.length === 1 && merged.rows[0].品名 === '新' && merged.rows[0].价格 === '9.9')

const appended = mergeDataByKey(
  ['条码'],
  [{ 条码: 'A1' }],
  ['条码'],
  [{ 条码: 'B2' }],
  '条码'
)
check('新条码追加一行', appended.rows.length === 2)

check('guessMergeKey 识别条码列', guessMergeKey(['品名', '条码']) === '条码')

const ds = { fieldMapArchive: {} }
rememberFieldMap(ds, ['A', 'B'], { 模板A: 'A' })
const sig = headersSignature(['A', 'B'])
check('映射归档可读', lookupSavedFieldMap(ds, ['A', 'B'])?.模板A === 'A' && ds.fieldMapArchive[sig])

check(
  'sanitize 去掉不存在列',
  sanitizeFieldMapForHeaders({ x: 'A', y: '缺失' }, ['A']).x === 'A' && !sanitizeFieldMapForHeaders({ x: 'A' }, ['A']).y
)

const fails = collectSceneRowFailures({
  sceneId: 'retail-price',
  components: [{ type: 'text', binding: '价格' }],
  rows: [{ 价格: '' }, { 价格: '12' }],
  fieldMap: {}
})
check('价签空价格体检', fails.some((f) => f.code === 'scene-empty-price'))

const noScene = collectSceneRowFailures({
  sceneId: '',
  components: [{ type: 'text', binding: '价格' }],
  rows: [{ 单价: '12' }],
  fieldMap: {}
})
check('无场景时不误报价签空价', !noScene.some((f) => f.code === 'scene-empty-price'))

const cal = getEffectiveCalibrate({ printConfig: { calibrate: { offsetXMm: 2, offsetYMm: 0, scalePercent: 98 } } })
check('项目校准优先', cal.offsetXMm === 2 && cal.scalePercent === 98)

check('默认校准归一', normalizeCalibrate(undefined).scalePercent === 100)

if (process.exitCode) process.exit(process.exitCode)
console.log('\nproductFeatures ok')
