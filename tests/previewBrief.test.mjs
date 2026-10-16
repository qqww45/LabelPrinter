import { layoutFitsPaper, buildPreviewBrief } from '../src/utils/diagnose.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

const fitOk = layoutFitsPaper({
  paper: { width: 210, height: 297 },
  margin: { top: 5, right: 5, bottom: 5, left: 5 },
  label: { width: 50, height: 30 },
  layout: { mode: 'auto', cols: 3, rows: 8, hGap: 2, vGap: 2 }
})
check('A4 三列能放下', fitOk.fits === true)

const fitBad = layoutFitsPaper({
  paper: { width: 40, height: 30 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  label: { width: 50, height: 30 },
  layout: { mode: 'single', cols: 1, rows: 1 }
})
check('标签大于纸张报溢出', fitBad.fits === false && fitBad.overflowW > 0)

const rows = [
  { __id: '1', 名称: 'A', 份数: 2 },
  { __id: '2', 名称: 'B', 份数: 1 }
]
const brief = buildPreviewBrief({
  components: [{ id: 'c1', type: 'text', text: '{{名称}}', binding: '名称', left: 1, top: 1, width: 20, height: 5 }],
  dataFields: ['名称', '份数'],
  fieldMap: {},
  rows,
  label: { width: 40, height: 30 },
  paper: { width: 40, height: 30 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  layout: { mode: 'single', cols: 1, rows: 1 },
  printConfig: { copies: 1, copiesColumn: '份数', media: 'gap', dpi: 203 },
  perPage: 1,
  labelCount: 3,
  pageCount: 3
})
check('摘要含纸张与将打标签', brief.facts.some(f => f.key === 'paper') && brief.facts.some(f => f.key === 'labels' && f.value.includes('3')))
check('按列份数有提示', brief.alerts.some(a => a.code === 'copies-column'))
check('热敏信息出现', brief.facts.some(f => f.key === 'media' && String(f.value).includes('间隙')))

const overflowBrief = buildPreviewBrief({
  components: [{ id: 'c1', type: 'text', text: 'x', left: 0, top: 0, width: 10, height: 5 }],
  dataFields: [],
  rows: [],
  label: { width: 60, height: 40 },
  paper: { width: 40, height: 30 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  layout: { mode: 'single' },
  printConfig: {},
  perPage: 1,
  labelCount: 0,
  pageCount: 1
})
check('预览摘要标出排版溢出', overflowBrief.hasError && overflowBrief.alerts.some(a => a.code === 'layout-overflow'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
