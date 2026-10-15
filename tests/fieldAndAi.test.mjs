import { replaceFieldToken, rewriteFieldMap } from '../src/utils/fieldCascade.js'
import { parseAIResponse } from '../src/utils/ai.js'

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

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
