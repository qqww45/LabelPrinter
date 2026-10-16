import { replaceFieldToken, rewriteFieldMap } from '../src/utils/fieldCascade.js'
import { parseAIResponse, parseAIPlan, normalizeAdjustPlan, validateAndNormalize, packAdjustContext, buildAdjustPrompt, buildAdjustMessages, splitPrintPatch, describeAdjustPlan } from '../src/utils/ai.js'

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}`) }
}

console.log('== 字段重命名 ==')
check('普通占位', replaceFieldToken('{{名称}}', '名称', '品名', false) === '{{品名}}')
check('带括号的列名', replaceFieldToken('{{价格(元)}}', '价格(元)', '单价', false) === '{{单价}}')
check('两个组件各自都能替换', (() => {
  const a = replaceFieldToken('{{name}}', 'name', 'title', false)
  const b = replaceFieldToken('{{name}}', 'name', 'title', false)
  return a === '{{title}}' && b === '{{title}}'
})())
check('表格占位括号成对', replaceFieldToken('x{{规格}}y', '规格', '型号', false) === 'x{{型号}}y')

const mapped = rewriteFieldMap({ 商品名: '名称', 名称: '名称' }, '名称', '品名', false)
check('映射值跟着数据列改', mapped['商品名'] === '品名')
check('同名模板字段的键也改', mapped['品名'] === '品名')
check('旧键不留', mapped['名称'] === undefined)

console.log('== AI JSON ==')
const wrapped = parseAIResponse('说明 {"components":[{"type":"text","text":"hi"}]} 结束')
check('对象包裹 components', Array.isArray(wrapped) && wrapped[0].text === 'hi')
const fenced = parseAIResponse('```json\n[{"type":"rect"}]\n```')
check('围栏数组', Array.isArray(fenced) && fenced[0].type === 'rect')

const planRaw = parseAIPlan('说明\n{"summary":"改价格","componentUpdates":[{"id":"c1","fontSize":18}],"print":{"copiesColumn":"份数","serialEnabled":true,"dpi":600}}')
check('调整结果取外层对象，不误拿内部数组', planRaw.summary === '改价格' && planRaw.componentUpdates.length === 1)

const ctx = {
  labelWidth: 60, labelHeight: 40, rowCount: 2,
  fields: ['产品名称', '规格', '价格'],
  components: [{ id: 'c1', type: 'text', text: '{{价格}}', binding: '价格' }]
}
const { plan, warnings } = normalizeAdjustPlan({
  summary: '改价格并按份数打',
  componentUpdates: [
    { id: 'c1', fontSize: 18, fill: '#dc2626', hideIfEmpty: true },
    { id: 'missing', fontSize: 9 }
  ],
  print: { copiesColumn: '份数', serialEnabled: true, serialStart: 1, dpi: 600, media: 'gap' },
  data: { addColumns: ['份数'], setColumn: [{ column: '份数', value: '1' }], setCells: [{ row: 9, column: '价格', value: '0' }] }
}, ctx)
check('未知组件被跳过', plan.componentUpdates.length === 1 && plan.componentUpdates[0].patch.hideIfEmpty === true)
check('新列可以成为份数列', plan.print.copiesColumn === '份数' && plan.print.serialEnabled === true)
check('非法分辨率被丢掉', plan.print.dpi == null)
check('越界单元格被丢掉', plan.data.setCells.length === 0 && warnings.some(w => w.includes('第 9 行')))
check('整列赋值留在新列上', plan.data.setColumn[0].value === '1')

const generated = validateAndNormalize([{ type: 'text', text: '{{序号}}', hideIfEmpty: true, binding: '' }], { labelWidth: 40, labelHeight: 30, fields: [] })
check('生成结果保留空内容不打印', generated.components[0].hideIfEmpty === true && generated.components[0].text === '{{序号}}')

const packed = packAdjustContext({
  project: {
    label: { width: 60, height: 40 },
    paper: { width: 210, height: 297 },
    margin: { top: 3, right: 3, bottom: 3, left: 3 },
    layout: { mode: 'auto', cols: 3, rows: 8, hGap: 2, vGap: 2 },
    printConfig: { copies: 1, media: 'gap', dpi: 203 },
    components: [{ id: 'c1', type: 'text', text: '{{产品名称}}', binding: '产品名称' }]
  },
  fields: ['产品名称', '价格'],
  rows: [{ 产品名称: '牛奶', 价格: '' }, { 产品名称: '面包', 价格: '6' }]
})
const prompt = buildAdjustPrompt(packed)
check('微调提示含布局、数据、打印和排版', prompt.includes('1. 布局') && prompt.includes('牛奶') && prompt.includes('3. 打印设置') && prompt.includes('4. 排版') && prompt.includes('210'))
check('空价格被统计出来', packed.profile.find(c => c.name === '价格').empty === 1)

const sheetPlan = normalizeAdjustPlan({
  summary: '改成 A4 三列',
  sheet: { paper: { width: 210, height: 297 }, layout: { mode: 'auto', cols: 0, rows: 8, hGap: 2 } }
}, { fields: [], components: [], labelWidth: 60, labelHeight: 40, rowCount: 0 })
check('排版列数至少为 1，并固定网格', sheetPlan.plan.sheet.layout.cols === 1 && sheetPlan.plan.sheet.layout.rows === 8 && sheetPlan.plan.sheet.layout.sizingMode === 'manual')
check('非法排版模式被丢掉', normalizeAdjustPlan({
  sheet: { layout: { mode: 'grid' } }
}, { fields: [], components: [], rowCount: 0 }).plan.sheet == null)

const qr = { id: 'q1', type: 'qrcode', name: '二维码', text: '{{条码}}', binding: '条码', width: 25, height: 25, left: 2, top: 2 }
const asBarcode = normalizeAdjustPlan({
  summary: '改成条形码',
  componentUpdates: [{ id: 'q1', type: 'barcode' }]
}, { fields: ['条码'], components: [qr], labelWidth: 60, labelHeight: 40, rowCount: 1 })
check('二维码可以改成条形码', asBarcode.plan.componentUpdates[0].patch.type === 'barcode' && asBarcode.plan.componentUpdates[0].patch.format === 'CODE128' && asBarcode.plan.componentUpdates[0].patch.name === '条形码')
const nested = normalizeAdjustPlan({
  componentUpdates: [{ id: 'q1', patch: { type: 'barcode' } }]
}, { fields: ['条码'], components: [qr], labelWidth: 60, labelHeight: 40, rowCount: 1 })
check('包在 patch 里的类型也能套用', nested.plan.componentUpdates[0].patch.type === 'barcode')

const withSel = packAdjustContext({
  project: {
    label: { width: 40, height: 30 },
    paper: { width: 40, height: 30 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    layout: { mode: 'single', cols: 1, rows: 1 },
    printConfig: {},
    components: [{ id: 'q1', type: 'qrcode', name: '二维码', binding: '条码', width: 18, height: 18, left: 2, top: 2 }]
  },
  fields: ['条码'],
  rows: [],
  selectedIds: ['q1']
})
check('提示里写明当前选中', buildAdjustPrompt(withSel).includes('当前选中：q1'))
const msgs = buildAdjustMessages('sys', [{ role: 'user', text: '改成条形码' }, { role: 'ai', text: '没有套上' }], '再试一次')
check('下一句能看见上一轮', msgs.length === 4 && msgs[1].content === '改成条形码' && msgs[3].content === '再试一次')

const byName = normalizeAdjustPlan({
  componentUpdates: [{ id: '二维码', fontFamily: 'SimHei', format: 'EAN13' }]
}, { fields: ['条码'], components: [qr], labelWidth: 60, labelHeight: 40, rowCount: 1 })
check('用名字能对上，字体和条码格式留得住', byName.plan.componentUpdates[0].id === 'q1' && byName.plan.componentUpdates[0].patch.fontFamily === 'SimHei')

const table = normalizeAdjustPlan({
  componentUpdates: [{ id: 't1', cells: { '0,1': { text: '{{价格}}', binding: '价格', type: 'text' } } }]
}, {
  fields: ['价格'],
  components: [{ id: 't1', type: 'table', cells: { '0,0': { text: '规格', binding: '' } } }],
  labelWidth: 60, labelHeight: 40, rowCount: 1
})
check('表格只改一格，原来的格子还在', table.plan.componentUpdates[0].patch.cells['0,1'].binding === '价格' && table.plan.componentUpdates[0].patch.cells['0,0'].text === '规格')

const mappedPlan = normalizeAdjustPlan({
  data: { fieldMap: { 商品名称: '产品名称', 产地: '没有这列' } }
}, { fields: ['产品名称'], components: [], rowCount: 1 })
check('字段映射只留存在的数据列', mappedPlan.plan.data.fieldMap.length === 1 && mappedPlan.plan.data.fieldMap[0].to === '产品名称')

const picked = normalizeAdjustPlan({
  componentUpdates: [{ id: '选中', type: 'barcode' }]
}, { fields: [], components: [qr], selectedIds: ['q1'], labelWidth: 60, labelHeight: 40, rowCount: 0 })
check('说选中就改当前这一个', picked.plan.componentUpdates[0].id === 'q1' && picked.plan.componentUpdates[0].patch.type === 'barcode')

const withCal = packAdjustContext({
  project: {
    label: { width: 40, height: 30 },
    paper: { width: 40, height: 30 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    layout: { mode: 'single', cols: 1, rows: 1 },
    printConfig: { media: 'gap', dpi: 203 },
    components: []
  },
  fields: [],
  rows: [],
  calibrate: { offsetXMm: 1.5, offsetYMm: -0.5, scalePercent: 98 }
})
check('微调上下文带本机校准', withCal.print.offsetXMm === 1.5 && withCal.print.scalePercent === 98)
check('微调提示说明热敏偏移', buildAdjustPrompt(withCal).includes('offsetXMm') && buildAdjustPrompt(withCal).includes('再往右'))

const calPlan = normalizeAdjustPlan({
  summary: '纠偏',
  print: { offsetXMm: -2, scalePercent: 97, dpi: 203 }
}, { fields: [], components: [], rowCount: 0 })
check('AI 可写热敏偏移与缩放', calPlan.plan.print.offsetXMm === -2 && calPlan.plan.print.scalePercent === 97 && calPlan.plan.print.dpi === 203)
check('只改 X 时不强行带上 Y', calPlan.plan.print.offsetYMm == null)

const split = splitPrintPatch(calPlan.plan.print)
check('校准与项目打印设置拆开', split.calibrate.offsetXMm === -2 && split.calibrate.scalePercent === 97 && split.printConfig.dpi === 203 && split.printConfig.offsetXMm == null)
check('描述里能看见校准', describeAdjustPlan(calPlan.plan).some(s => s.includes('缩放') || s.includes('偏移')))

const badScale = normalizeAdjustPlan({
  print: { scalePercent: 999 }
}, { fields: [], components: [], rowCount: 0 })
check('非法缩放被夹到上限', badScale.plan.print.scalePercent === 150)

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
