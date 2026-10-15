import { parseCSVText } from '../src/utils/excel.js'
import { renderText, renderTextWithAlert, codePayload, rewriteBindingText, reconcileBoundText } from '../src/utils/render.js'
import { availableFields, componentMissingFields, missingFieldsByComponent, findOutOfBounds, runDiagnostics } from '../src/utils/diagnose.js'
import { generateBarcode } from '../src/utils/barcode.js'
import { generateQRCode } from '../src/utils/qrcode.js'
import dayjs from 'dayjs'
import fs from 'fs'

const csv = fs.readFileSync('./test-data.csv', 'utf-8')

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}`) }
}

console.log('== 1. CSV 解析 ==')
const { headers, rows } = parseCSVText(csv)
check('字段数 = 5', headers.length === 5)
check('第一字段为 产品名称', headers[0] === '产品名称')
check('解析出 5 行数据', rows.length === 5)
check('第一行产品=矿泉水', rows[0]['产品名称'] === '矿泉水')
check('第一行条码', rows[0]['条码'] === '6901234567890')

console.log('== 2. 占位符渲染 ==')
check('基础替换', renderText('名称: {{产品名称}}', rows[0]) === '名称: 矿泉水')
check('多占位符', renderText('{{产品名称}}-{{规格}}', rows[1]) === '可乐-330ml')
check('无数据保留', renderText('{{产品名称}}', null) === '{{产品名称}}')
check('空对象保留占位符', renderText('¥{{价格}}', {}) === '¥{{价格}}')
check('绑定条码无数据不造假码', codePayload({ binding: '条码', text: '' }, {}) === '')
check('静态条码保留原文', codePayload({ binding: '', text: 'ABC' }, {}) === 'ABC')
check('未知字段为空', renderText('X{{不存在}}Y', rows[0]) === 'XY')

console.log('== 3. 日期格式化 ==')
check('日期格式', dayjs(rows[0]['生产日期']).format('YYYY/MM/DD') === '2026/10/01')

console.log('== 4. 日期工具 ==')
check('dayjs 可用', typeof dayjs().format === 'function')

// ============ 5. 标签/纸张分离逻辑（复刻 store 核心 calc） ============
console.log('== 5. 标签排版几何 ==')
function calcGrid(paper, margin, label, hGap, vGap) {
  const aw = paper.width - margin.left - margin.right
  const ah = paper.height - margin.top - margin.bottom
  const lw = Math.max(1, label.width)
  const lh = Math.max(1, label.height)
  const cols = Math.max(1, Math.floor((aw + hGap) / (lw + hGap)))
  const rows = Math.max(1, Math.floor((ah + vGap) / (lh + vGap)))
  return { cols, rows }
}
function getLabelRect(margin, label, cols, rows, hGap, vGap, idx) {
  const col = idx % cols
  const row = Math.floor(idx / cols)
  return {
    x: margin.left + col * (label.width + hGap),
    y: margin.top + row * (label.height + vGap),
    width: label.width, height: label.height
  }
}

// A4 + 50×30 标签 + 3mm 间距
const P = { width: 210, height: 297 }
const M = { top: 3, right: 3, bottom: 3, left: 3 }
const L = { width: 50, height: 30 }
const g = calcGrid(P, M, L, 3, 3)
check('A4 + 50×30 → 3 列', g.cols === 3)
check('A4 + 50×30 → 8 行', g.rows === 8)
check('每页 24 个', g.cols * g.rows === 24)

const r0 = getLabelRect(M, L, g.cols, g.rows, 3, 3, 0)
check('第 0 个标签起点 (3,3)', r0.x === 3 && r0.y === 3)
const r23 = getLabelRect(M, L, g.cols, g.rows, 3, 3, 23)
check('第 23 个标签 x = 3 + 2×53 = 109', r23.x === 109)
check('第 23 个标签 y = 3 + 7×33 = 234', r23.y === 234)

// 标签大于纸张内容区 → 至少 1×1
const gSmall = calcGrid(P, M, { width: 500, height: 300 }, 3, 3)
check('超大标签 → 至少 1×1', gSmall.cols === 1 && gSmall.rows === 1)

// 小标签 30×20 → 更密集
const gDense = calcGrid(P, M, { width: 30, height: 20 }, 2, 2)
check('30×20 标签 → 6 列', gDense.cols === 6)
check('30×20 标签 → 13 行', gDense.rows === 13)

// 手动 4×5 排版的标签位置
const rm = getLabelRect(M, { width: 60, height: 40 }, 4, 5, 2, 2, 19)
check('手动 4×5 第 19 个标签 x = 3 + 3×62 = 189', rm.x === 189)

// ============ 6. M2：字段映射 ============
console.log('== 6. 字段映射 ==')
const { resolveRow, extractTemplateFields, autoMatchFieldMap, findUnmappedFields } = await import('../src/utils/render.js')

const dataRow = { 产品名称: '矿泉水', 价格: '2.50', 条码: '6901234567890' }
const map1 = { 商品名: '产品名称', 售价: '价格' }
const resolved = resolveRow(dataRow, map1)
check('映射后可直接用模板字段名', resolved['商品名'] === '矿泉水')
check('映射不影响原字段', resolved['产品名称'] === '矿泉水')
check('renderText 用模板字段', renderText('{{商品名}} ¥{{售价}}', resolved) === '矿泉水 ¥2.50')
check('空映射返回原行', resolveRow(dataRow, {}) === dataRow)
check('映射到不存在的列 → 保留原名行为空', renderText('{{不存在}}', resolveRow(dataRow, { 不存在: '缺列' })) === '')

const comps = [
  { type: 'text', text: '{{商品名}} - {{规格}}', binding: '' },
  { type: 'barcode', binding: '条码' },
  { type: 'table', cells: { '0,0': { text: '价格', binding: '价格' }, '0,1': { text: '{{产地}}' } } }
]
const used = extractTemplateFields(comps)
check('收集占位符+绑定字段', ['商品名', '规格', '条码', '价格', '产地'].every(f => used.includes(f)))
check('字段去重', used.length === new Set(used).size)
check('无组件 → 空数组', extractTemplateFields([]).length === 0)

const auto = autoMatchFieldMap(['产品名称', '价格', '不存在的字段'], ['产品名称', '价格', '条码'], {})
check('同名自动映射', auto['产品名称'] === '产品名称' && auto['价格'] === '价格')
check('无同名字段不映射', auto['不存在的字段'] === undefined)
check('已有映射不被覆盖', autoMatchFieldMap(['产品名称'], ['产品名称'], { 产品名称: '条码' })['产品名称'] === '条码')

check('未匹配检测', findUnmappedFields(['产品名称', '越界字段'], ['产品名称'], {}).join() === '越界字段')
check('已映射不算未匹配', findUnmappedFields(['走味'], ['产品名称'], { 走味: '产品名称' }).length === 0)

// ============ 7. M2：模板库 ============
console.log('== 7. 模板库 ==')
const { BUILTIN_TEMPLATES, snapshotAsTemplate } = await import('../src/utils/templates.js')

check('内置模板 >= 5 个', BUILTIN_TEMPLATES.length >= 5)
check('模板 id 唯一', new Set(BUILTIN_TEMPLATES.map(t => t.id)).size === BUILTIN_TEMPLATES.length)
check('每个模板都有组件', BUILTIN_TEMPLATES.every(t => t.components.length > 0))
check('每个模板有纸张/标签/排版', BUILTIN_TEMPLATES.every(t => t.paper && t.label && t.layout))
check('组件 id 在模板内唯一', BUILTIN_TEMPLATES.every(t => {
  const ids = t.components.map(c => c.id)
  return new Set(ids).size === ids.length
}))
check('组件不越出标签边界', BUILTIN_TEMPLATES.every(t =>
  t.components.every(c => c.left >= 0 && c.top >= 0 &&
    c.left + c.width <= t.label.width + 0.01 && c.top + c.height <= t.label.height + 0.01)
))
check('表格模板的列宽比例与列数一致', BUILTIN_TEMPLATES.every(t =>
  t.components.every(c => c.type !== 'table' || !c.colWidths.length || c.colWidths.length === c.cols)
))

const snap = snapshotAsTemplate({
  paper: { width: 100, height: 100 },
  label: { width: 50, height: 30 },
  margin: { top: 1, right: 1, bottom: 2, left: 2 },
  layout: { mode: 'single', cols: 1, rows: 1 },
  components: [{ id: 'x1', type: 'text', left: 1, top: 1, width: 10, height: 5 }]
}, '我的模板')
check('另存为模板带快照', snap.label.width === 50 && snap.components.length === 1)
check('另存为模板标记 custom', snap.custom === true && snap.group === '我的模板')
check('快照与源对象解耦', (() => {
  const c = { components: [{ id: 'a' }], paper: {}, label: {}, margin: {}, layout: {} }
  const s = snapshotAsTemplate(c, 'x')
  s.components[0].id = 'changed'
  return c.components[0].id === 'a'
})())

console.log('== 8. 设计体检（字段失效 / 越界 / 打印前检查）==')
const df = ['产品名称', '规格', '价格']
check('可用字段含数据列', availableFields(df, {}).has('价格'))
check('映射成功的目标字段也算可用', availableFields(df, { 商品名: '产品名称' }).has('商品名'))
check('映射到不存在的列不算可用', !availableFields(df, { 商品名: '不存在列' }).has('商品名'))

const compOk = { id: 'c1', type: 'text', binding: '价格', text: '{{价格}}' }
const compBad = { id: 'c2', type: 'text', binding: '库存', text: '库存：{{库存}}' }
check('字段存在 → 不报警', componentMissingFields(compOk, availableFields(df, {})).length === 0)
check('字段不存在 → 报警', componentMissingFields(compBad, availableFields(df, {}))[0] === '库存')
check('数据为空 → 不报字段错（改由「没有数据」提示）', missingFieldsByComponent([compBad], [], {}).length === 0)

const tableComp = { id: 't1', type: 'table', cols: 2, rows: 1, cells: { '0,0': { text: '{{库存}}' } } }
check('表格单元格的 {{}} 也参与校验', componentMissingFields(tableComp, availableFields(df, {})).includes('库存'))

const lb = { width: 60, height: 40 }
check('标签内不报越界', findOutOfBounds([compOk], lb).length === 0)
check('右侧溢出被识别', findOutOfBounds([{ id: 'o1', type: 'text', left: 50, top: 1, width: 20 }], lb).length === 1)
check('文本不判底边（高度自适应，避免误报）', findOutOfBounds([{ id: 'o2', type: 'text', left: 1, top: 38, width: 10 }], lb).length === 0)
check('非文本元素判底边', findOutOfBounds([{ id: 'o3', type: 'image', left: 1, top: 38, width: 10, height: 10 }], lb).length === 1)

const avail = availableFields(df, {})
check('字段不存在 → ⚠ 标记', renderTextWithAlert('{{库存}}', { 价格: '9' }, avail).text === '⚠库存')
check('保留上下文文字', renderTextWithAlert('价格：{{库存}}', { 价格: '9' }, avail).text === '价格：⚠库存')
check('字段存在但该行为空 → 留空不误报', renderTextWithAlert('{{价格}}', { 产品名称: 'x' }, avail).text === '')
check('无数据时保留占位符', renderTextWithAlert('{{库存}}', {}, new Set()).text === '{{库存}}')

console.log('== 换绑后占位符跟着走 ==')
check('换绑保留后缀', rewriteBindingText('{{名称}}111', '名称', 'ID号') === '{{ID号}}111')
check('没旧绑定时替换唯一占位符', rewriteBindingText('{{名称}}111', '', 'ID号') === '{{ID号}}111')
check('只替换旧绑定那一个', rewriteBindingText('{{公司名称}}-{{名称}}', '名称', 'ID号') === '{{公司名称}}-{{ID号}}')
check('多个占位且没有旧绑定则不动', rewriteBindingText('{{公司名称}}-{{名称}}', '', 'ID号') === '{{公司名称}}-{{名称}}')
check('没有占位符则写成绑定', rewriteBindingText('固定文字', '', 'ID号') === '{{ID号}}')
check('解绑去掉占位符留后缀', rewriteBindingText('{{名称}}111', '名称', '') === '111')
const healed = reconcileBoundText('{{名称}}111', 'ID号', ['ID号', '公司名称'], {})
check('绑定已是现有列、占位符是旧列 → 改写', healed === '{{ID号}}111')
check('改写后不再报缺失字段', componentMissingFields({ type: 'text', binding: 'ID号', text: healed }, availableFields(['ID号', '公司名称'], {})).length === 0)
check('映射成功的旧字段保留', reconcileBoundText('{{名称}}111', 'ID号', ['ID号'], { 名称: 'ID号' }) === '{{名称}}111')
check('映射成功后画布能取到值', renderText(reconcileBoundText('{{名称}}111', 'ID号', ['ID号'], { 名称: 'ID号' }), { 名称: 'XM001', ID号: 'XM001' }) === 'XM001111')

const diagOk = runDiagnostics({ components: [compOk], dataFields: df, fieldMap: {}, rowCount: 5, label: lb, paper: { width: 100, height: 100 }, perPage: 1 })
check('正常场景无 error', diagOk.errors.length === 0)
check('5 行 / 每页 1 → 5 页', diagOk.summary.pages === 5)

const diagBad = runDiagnostics({ components: [compBad], dataFields: df, fieldMap: {}, rowCount: 3, label: lb, paper: { width: 100, height: 100 }, perPage: 2 })
check('字段失效 → error', diagBad.hasError && diagBad.issues.some(i => i.code === 'missing-fields'))
check('3 行 / 每页 2 → 2 页', diagBad.summary.pages === 2)

const diagEmpty = runDiagnostics({ components: [], dataFields: [], fieldMap: {}, rowCount: 0, label: lb, paper: {} })
check('空画布 → error', diagEmpty.hasError && diagEmpty.issues.some(i => i.code === 'empty-canvas'))
check('无数据 → warn 而非 error', diagEmpty.warnings.some(i => i.code === 'no-data'))
check('映射后字段不再报错', runDiagnostics({ components: [compBad], dataFields: df, fieldMap: { 库存: '规格' }, rowCount: 1, label: lb, paper: {} }).errors.length === 0)

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)