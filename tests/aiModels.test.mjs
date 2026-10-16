import {
  AI_MODEL_CATALOG,
  applyModelChoice,
  applyProviderChoice,
  findModel,
  isKnownModel,
  modelSupportsVision,
  modelsForProvider,
  modelsForBaseUrl,
  providerByBaseUrl
} from '../src/utils/aiModels.js'

let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  ok', name) }
  else { failed++; console.log('  FAIL', name) }
}

check('目录非空', AI_MODEL_CATALOG.length >= 8)
check('deepseek-flash 可看图', modelSupportsVision('deepseek-flash') === true)
check('deepseek-chat 不可看图', modelSupportsVision('deepseek-chat') === false)
check('已知模型识别', isKnownModel('qwen-vl-plus') && !isKnownModel('no-such-model'))

const next = applyModelChoice({ baseUrl: 'x', model: 'y' }, 'gpt-4o-mini')
check('选模型可带上对应 endpoint', next.model === 'gpt-4o-mini' && next.baseUrl.includes('openai.com'))
check('同 Base 下列表不含别家', modelsForBaseUrl('https://api.deepseek.com/v1').every(m => m.provider === 'deepseek'))

const prov = applyProviderChoice({ baseUrl: '', model: 'gpt-4o' }, 'deepseek')
check('换服务商落到默认模型', prov.model === 'deepseek-flash' && providerByBaseUrl(prov.baseUrl)?.id === 'deepseek')

const keep = applyProviderChoice({ baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' }, 'openai')
check('同服务商保留当前模型', keep.model === 'gpt-4o')

check('DeepSeek 列表含 Flash', modelsForProvider('deepseek').some(m => m.id === 'deepseek-flash'))
check('findModel 有 label', !!findModel('qwen-plus')?.label)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
