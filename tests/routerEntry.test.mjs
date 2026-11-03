import {
  resolveDefaultPath,
  hasStoredProjects,
  readHasStoredProjects
} from '../src/utils/routerEntry.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(resolveDefaultPath({ hasProjects: false, path: '/' }) === '/', '无项目留首页')
assert(resolveDefaultPath({ hasProjects: true, path: '/' }) === '/app', '有项目默认进工作台')
assert(resolveDefaultPath({ hasProjects: true, path: '/', query: { home: '1' } }) === null, '显式 home 不跳转')
assert(resolveDefaultPath({ hasProjects: true, path: '/help' }) === null, '帮助深链不覆盖')
assert(resolveDefaultPath({ hasProjects: false, path: '/templates' }) === null, '模板页不覆盖')
assert(resolveDefaultPath({ hasProjects: true, path: '/app' }) === null, '工作台不覆盖')

assert(hasStoredProjects('') === false, '空串无项目')
assert(hasStoredProjects('{"list":[]}') === false, '空列表')
assert(hasStoredProjects('{"list":[{"id":"a"}]}') === true, '有列表项')
assert(readHasStoredProjects(() => '{"list":[{"id":"x"}]}') === true, 'read helper')

console.log('routerEntry.test.mjs: 10 passed')
