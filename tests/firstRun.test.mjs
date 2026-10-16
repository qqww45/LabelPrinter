import { shouldOfferWelcome } from '../src/utils/firstRun.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const fresh = { introDone: false, projectCount: 1, componentCount: 0, rowCount: 0 }
assert(shouldOfferWelcome(fresh) === true, '空项目第一次打开要讲清工具')
assert(shouldOfferWelcome({ ...fresh, introDone: true }) === false, '看过介绍不再挡')
assert(shouldOfferWelcome({ ...fresh, projectCount: 2 }) === false, '已有多个项目不再挡')
assert(shouldOfferWelcome({ ...fresh, componentCount: 2 }) === false, '画布已有组件不再挡')
assert(shouldOfferWelcome({ ...fresh, rowCount: 3 }) === false, '已有数据行不再挡')
assert(shouldOfferWelcome({ ...fresh, projectCount: 0 }) === true, '还没有项目列表时仍要介绍')

console.log('firstRun.test.mjs: 6 passed')
