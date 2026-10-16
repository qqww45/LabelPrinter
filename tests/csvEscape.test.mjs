import { escapeCsvCell } from '../src/utils/excel.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

console.log('\ncsvEscape')

check('普通文字原样', escapeCsvCell('牛奶') === '牛奶')
check('普通负数保留', escapeCsvCell('-12.5') === '-12.5' && escapeCsvCell('-3') === '-3')
check('公式开头加单引号', escapeCsvCell('=1+1') === "'=1+1")
check('加号和 at 也加单引号', escapeCsvCell('+1') === "'+1" && escapeCsvCell('@SUM(A1)') === "'@SUM(A1)")
check('减号公式加单引号', escapeCsvCell('-2+3') === "'-2+3")
check('前导空格后的公式也拦', escapeCsvCell(' =1+1') === "' =1+1")
check('含逗号的公式仍按 CSV 引用', escapeCsvCell('=1,2') === `"'=1,2"`)
check('引号转义', escapeCsvCell('说"你好"') === '"说""你好"""')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
