// 测试 dataMerge.mergeDataAppend（输入：旧对象数组 + 新二维数组 → 输出：对象数组）
import { mergeDataAppend } from '../src/utils/dataMerge.js'

function eq(name, a, b) {
  const aJ = JSON.stringify(a)
  const bJ = JSON.stringify(b)
  if (aJ !== bJ) {
    console.log('FAIL', name, '\n  expect:', bJ, '\n  got:   ', aJ)
    process.exit(1)
  } else {
    console.log('OK  ', name)
  }
}

// 1) 基础追加：列数相同
{
  const r = mergeDataAppend(
    ['产品', '价格'],
    [{ 产品: 'A', 价格: '1' }, { 产品: 'B', 价格: '2' }],
    ['产品', '价格'],
    [['C', '3'], ['D', '4']]
  )
  eq('基础追加-列', r.headers, ['产品', '价格'])
  eq('基础追加-行数', r.rows.length, 4)
  eq('基础追加-行内容', r.rows, [
    { 产品: 'A', 价格: '1' },
    { 产品: 'B', 价格: '2' },
    { 产品: 'C', 价格: '3' },
    { 产品: 'D', 价格: '4' }
  ])
}

// 2) 不同列：旧有"规格"、新增"厂商"
{
  const r = mergeDataAppend(
    ['产品', '规格', '价格'],
    [{ 产品: 'A', 规格: '5V/2A', 价格: '¥29' }],
    ['产品', '厂商', '颜色'],
    [['X', '小米', '白']]
  )
  eq('不同列-列合并', r.headers, ['产品', '规格', '价格', '厂商', '颜色'])
  eq('不同列-行内容', r.rows, [
    { 产品: 'A', 规格: '5V/2A', 价格: '¥29', 厂商: '', 颜色: '' },
    { 产品: 'X', 规格: '', 价格: '', 厂商: '小米', 颜色: '白' }
  ])
}

// 3) 列部分重叠
{
  const r = mergeDataAppend(
    ['产品', '规格', '价格'],
    [{ 产品: 'A', 规格: 'X', 价格: '1' }],
    ['产品', '厂商', '价格'],
    [['B', '小米', '2']]
  )
  eq('部分重叠-列', r.headers, ['产品', '规格', '价格', '厂商'])
  eq('部分重叠-行', r.rows, [
    { 产品: 'A', 规格: 'X', 价格: '1', 厂商: '' },
    { 产品: 'B', 规格: '', 价格: '2', 厂商: '小米' }
  ])
}

// 4) 空旧数据
{
  const r = mergeDataAppend([], [], ['A', 'B'], [['1', '2']])
  eq('空旧-列', r.headers, ['A', 'B'])
  eq('空旧-行', r.rows, [{ A: '1', B: '2' }])
}

// 5) 空新数据
{
  const r = mergeDataAppend(['A'], [{ A: 'x' }], [], [])
  eq('空新-列', r.headers, ['A'])
  eq('空新-行', r.rows, [{ A: 'x' }])
}

// 6) 边界：旧行有 __id（不参与输出，符合 setData 行为：setData 内部重新分配 __id）
{
  const r = mergeDataAppend(
    ['产品'],
    [{ __id: 'r1', 产品: 'A' }],
    ['产品'],
    [['B']]
  )
  eq('__id-列', r.headers, ['产品'])
  eq('__id-行', r.rows, [{ 产品: 'A' }, { 产品: 'B' }])
}

// 7) 边界：新行长度 < newHeaders（短行）
{
  const r = mergeDataAppend(
    ['产品'],
    [{ 产品: 'A' }],
    ['产品', '价格'],
    [['B']]  // 只 1 列，缺价格
  )
  eq('短行-列', r.headers, ['产品', '价格'])
  eq('短行-行', r.rows, [
    { 产品: 'A', 价格: '' },
    { 产品: 'B', 价格: '' }
  ])
}

// 8) 对象行（parseExcelFile 的实际返回）不能被当成空行
{
  const r = mergeDataAppend(
    ['产品', '价格'],
    [{ 产品: 'A', 价格: '1' }],
    ['产品', '价格'],
    [{ 产品: 'B', 价格: '2' }]
  )
  eq('对象行追加', r.rows, [
    { 产品: 'A', 价格: '1' },
    { 产品: 'B', 价格: '2' }
  ])
}

console.log('\nAll data merge tests passed.')
