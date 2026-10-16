import { fileProjectName, insertOpenedProject } from '../src/utils/projectOpen.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const existing = {
  id: 'p_old',
  name: '现有价签',
  updatedAt: 1,
  data: { meta: { name: '现有价签' }, components: [{ id: 'keep' }] }
}
const incoming = { meta: { name: '外来面单' }, components: [{ id: 'new' }] }
const out = insertOpenedProject([existing], incoming, { id: 'p_new', now: 9, fileName: 'ignored.json' })

assert(out.currentId === 'p_new', '打开后当前项目是新文件')
assert(out.list.length === 2, '列表多一条，不替换')
assert(out.list[0].id === 'p_new', '新项目在最前')
assert(out.list[0].data.components[0].id === 'new', '新项目用文件内容')
assert(out.list[1] !== existing || out.list[1].data === existing.data, '旧条目还在')
assert(out.list[1].data === existing.data, '旧项目数据对象没被换掉')
assert(out.list[1].data.components[0].id === 'keep', '旧项目内容还在')
assert(fileProjectName({}, '价签.json') === '价签', '没写名字时用文件名')
assert(fileProjectName({ meta: { name: '店内' } }, '价签.json') === '店内', '文件里的名字优先')
assert(fileProjectName({}, '') === '未命名项目', '都没有时用默认名')

const named = insertOpenedProject([], {}, { id: 'p2', fileName: '货架.lbp' })
assert(named.list[0].name === '货架', '空文件用文件名')
assert(named.list[0].data.meta.name === '货架', '空文件补上项目名')

console.log('projectOpen ok')
