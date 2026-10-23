import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  BUILTIN_SOURCE,
  BUILTIN_DEFAULT_ENDPOINT,
  CUSTOM_SOURCE,
  DEFAULT_AI_SOURCE,
  normalizeSource,
  normalizeBuiltinEndpoint
} from '../src/utils/aiModels.js'
import { resolveChatTarget } from '../src/utils/ai.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

check('新用户默认走内置', DEFAULT_AI_SOURCE === BUILTIN_SOURCE)
// 来源读不出来时保守留在自定义，别把老用户填好的 Key 悄悄架空
check('未知来源落回自定义', normalizeSource('weird') === CUSTOM_SOURCE && normalizeSource(undefined) === CUSTOM_SOURCE)
check('内置来源原样保留', normalizeSource(BUILTIN_SOURCE) === BUILTIN_SOURCE)
check('空端点回落到默认', normalizeBuiltinEndpoint('') === BUILTIN_DEFAULT_ENDPOINT)
check('端点去空格', normalizeBuiltinEndpoint('  /ai-chat  ') === '/ai-chat')

const builtin = resolveChatTarget({ source: BUILTIN_SOURCE, builtinEndpoint: '' })
check('内置走同源端点', builtin.kind === 'builtin' && builtin.url === BUILTIN_DEFAULT_ENDPOINT)
check('内置不带 Key', !('apiKey' in builtin))

const builtinCustomPath = resolveChatTarget({ source: BUILTIN_SOURCE, builtinEndpoint: '/my-ai' })
check('内置端点可改', builtinCustomPath.url === '/my-ai')

const custom = resolveChatTarget({
  source: CUSTOM_SOURCE,
  baseUrl: 'https://api.deepseek.com/v1/',
  apiKey: 'sk-x',
  model: 'deepseek-flash'
})
check('自定义拼出 chat/completions', custom.kind === 'custom' && custom.url === 'https://api.deepseek.com/v1/chat/completions')
check('自定义带上 Key 与模型', custom.apiKey === 'sk-x' && custom.model === 'deepseek-flash')

const empty = resolveChatTarget({})
check('缺省走自定义且不伪造 Key', empty.kind === 'custom' && empty.apiKey === '')

// 前端默认端点必须真的有对应的 EdgeOne 路由文件，否则线上 404
const routeName = String(BUILTIN_DEFAULT_ENDPOINT).replace(/^\/+/, '')
const routeFile = resolve(root, 'agents', routeName, 'index.ts')
check('端点与 agents 路由同名', existsSync(routeFile))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
