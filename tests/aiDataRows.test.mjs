import { normalizeAdjustPlan, adjustPlanIsEmpty, describeAdjustPlan } from '../src/utils/ai.js'

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}`) }
}

const ctx = { labelWidth: 60, labelHeight: 40, rowCount: 0, fields: ['编码'], components: [] }

console.log('== addRows：0 行数据也能造测试数据 ==')
{
  const { plan, warnings } = normalizeAdjustPlan({
    summary: '生成 8 条测试编码',
    data: { addRows: [{ 编码: 'TEST0001' }, { 编码: 'TEST0002' }, { 编码: 'TEST0003' }] }
  }, ctx)
  check('空数据也能生成行', plan.data.addRows.length === 3 && plan.data.addRows[0].编码 === 'TEST0001')
  check('计划不再为空', !adjustPlanIsEmpty(plan))
  check('描述里说明新增行数', describeAdjustPlan(plan).some(l => l.includes('新增 3 行数据')))
  check('没有警告', warnings.length === 0)
}

console.log('== addRows 列校验 ==')
{
  const { plan, warnings } = normalizeAdjustPlan({
    data: {
      addColumns: ['名称'],
      addRows: [
        { 编码: 'A1', 名称: '商品A', 不存在的列: 'x' },
        {},
        { 编码: '' }
      ]
    }
  }, ctx)
  check('已有列 + 新增列都能写', plan.data.addRows[0].编码 === 'A1' && plan.data.addRows[0].名称 === '商品A')
  check('未声明的列被跳过并警告', !('不存在的列' in plan.data.addRows[0]) && warnings.some(w => w.includes('不存在的列')))
  check('全空的行被丢弃', plan.data.addRows.length === 1)
}

console.log('== setCells 行号按加行之后算 ==')
{
  const ctx2 = { ...ctx, rowCount: 2 }
  const { plan, warnings } = normalizeAdjustPlan({
    data: {
      addRows: [{ 编码: 'N1' }, { 编码: 'N2' }, { 编码: 'N3' }],
      setCells: [
        { row: 1, column: '编码', value: '旧行改' },
        { row: 5, column: '编码', value: '新行改' },
        { row: 6, column: '编码', value: '越界' }
      ]
    }
  }, ctx2)
  check('旧行与新行都能写', plan.data.setCells.length === 2 && plan.data.setCells[1].value === '新行改')
  check('越界行被拒', warnings.some(w => w.includes('第 6 行')))
}

console.log('== addRows 上限与值清洗 ==')
{
  const many = Array.from({ length: 130 }, (_, i) => ({ 编码: 'T' + i }))
  const long = { 编码: 'x'.repeat(600) }
  const { plan } = normalizeAdjustPlan({
    data: { addRows: [...many, long] }
  }, ctx)
  check('一次最多 100 行', plan.data.addRows.length === 100)
  check('值被截断到 500 字符', normalizeAdjustPlan({ data: { addRows: [long] } }, ctx).plan.data.addRows[0].编码.length === 500)
  check('值被转成字符串', normalizeAdjustPlan({ data: { addRows: [{ 编码: 123 }] } }, ctx).plan.data.addRows[0].编码 === '123')
}

console.log('== removeRows ==')
{
  const ctx3 = { ...ctx, rowCount: 5 }
  const { plan, warnings } = normalizeAdjustPlan({
    data: { removeRows: [5, 2, 2, 0, 99] }
  }, ctx3)
  check('合法行去重升序', plan.data.removeRows.join(',') === '2,5')
  check('越界行警告', warnings.filter(w => w.includes('不存在')).length === 2)
  check('空计划判断含删行', !adjustPlanIsEmpty(plan))
  check('描述里说明删行', describeAdjustPlan(plan).some(l => l.includes('删除第 2、5 行')))
}

console.log('== 只删行也视为数据改动 ==')
{
  const plan = normalizeAdjustPlan({ summary: '删两行', data: { removeRows: [1] } }, { ...ctx, rowCount: 3 }).plan
  check('空数组不算改动，删行算', !adjustPlanIsEmpty(plan))
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
