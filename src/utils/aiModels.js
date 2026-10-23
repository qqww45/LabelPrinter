/**
 * 常用 AI 模型目录：给设置页 / 对话框下拉用。
 * id 是发给接口的 model 字段；label 给人看。
 */

export const CUSTOM_MODEL_VALUE = '__custom__'

/** AI 来源：内置（站点自带的 EdgeOne 端点，免 Key）或自定义（用户自带 Key） */
export const BUILTIN_SOURCE = 'builtin'
export const CUSTOM_SOURCE = 'custom'
/** 新用户默认用内置；读不出来来源时不乱改老用户的自定义配置 */
export const DEFAULT_AI_SOURCE = BUILTIN_SOURCE
/** 内置端点路径：与 agents/ai-chat/index.ts 的路由一致，同源，CSP 无需放行 */
export const BUILTIN_DEFAULT_ENDPOINT = '/ai-chat'
export const BUILTIN_MODEL_LABEL = '内置模型（EdgeOne AI）'
/** 内置默认走纯文本模型；支持看图的网关模型要在服务端配 AI_GATEWAY_MODEL */
export const BUILTIN_SUPPORTS_VISION = false

export function normalizeSource(v) {
  return v === BUILTIN_SOURCE ? BUILTIN_SOURCE : CUSTOM_SOURCE
}

export function normalizeBuiltinEndpoint(v) {
  const s = String(v || '').trim()
  return s || BUILTIN_DEFAULT_ENDPOINT
}

export const AI_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-flash'
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash'
  },
  {
    id: 'qwen',
    name: '阿里 Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus'
  },
  {
    id: 'moonshot',
    name: '月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini'
  },
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b'
  }
]

/** @type {{ id: string, label: string, provider: string, baseUrl: string, vision: boolean }[]} */
export const AI_MODEL_CATALOG = [
  { id: 'deepseek-flash', label: 'DeepSeek Flash（推荐·可看图）', provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', vision: true },
  { id: 'deepseek-chat', label: 'DeepSeek Chat（纯文本）', provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', vision: false },
  { id: 'glm-4-flash', label: '智谱 GLM-4 Flash（纯文本）', provider: 'zhipu', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', vision: false },
  { id: 'glm-4v-flash', label: '智谱 GLM-4V Flash（可看图）', provider: 'zhipu', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', vision: true },
  { id: 'qwen-plus', label: '通义 Qwen-Plus（纯文本）', provider: 'qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', vision: false },
  { id: 'qwen-vl-plus', label: '通义 Qwen-VL Plus（可看图）', provider: 'qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', vision: true },
  { id: 'moonshot-v1-8k', label: 'Kimi moonshot-v1-8k（纯文本）', provider: 'moonshot', baseUrl: 'https://api.moonshot.cn/v1', vision: false },
  { id: 'gpt-4o-mini', label: 'OpenAI GPT-4o mini（可看图）', provider: 'openai', baseUrl: 'https://api.openai.com/v1', vision: true },
  { id: 'gpt-4o', label: 'OpenAI GPT-4o（可看图）', provider: 'openai', baseUrl: 'https://api.openai.com/v1', vision: true },
  { id: 'qwen2.5:7b', label: 'Ollama qwen2.5:7b（本地·纯文本）', provider: 'ollama', baseUrl: 'http://localhost:11434/v1', vision: false },
  { id: 'llava', label: 'Ollama llava（本地·可看图）', provider: 'ollama', baseUrl: 'http://localhost:11434/v1', vision: true }
]

export function findProvider(id) {
  return AI_PROVIDERS.find((p) => p.id === id) || null
}

export function findModel(id) {
  const s = String(id || '').trim()
  if (!s) return null
  return AI_MODEL_CATALOG.find((m) => m.id === s) || null
}

export function providerByBaseUrl(baseUrl) {
  const u = String(baseUrl || '').replace(/\/+$/, '')
  return AI_PROVIDERS.find((p) => p.baseUrl.replace(/\/+$/, '') === u) || null
}

export function modelsForProvider(providerId) {
  return AI_MODEL_CATALOG.filter((m) => m.provider === providerId)
}

export function modelsForBaseUrl(baseUrl) {
  const p = providerByBaseUrl(baseUrl)
  if (p) return modelsForProvider(p.id)
  return []
}

export function isKnownModel(id) {
  return !!findModel(id)
}

export function modelSupportsVision(id) {
  return !!findModel(id)?.vision
}

/** 选模型时同步 endpoint；未知 id 只改 model */
export function applyModelChoice(current, modelId) {
  const cur = current || {}
  const id = String(modelId || '').trim()
  if (!id || id === CUSTOM_MODEL_VALUE) {
    return { baseUrl: cur.baseUrl, model: cur.model }
  }
  const m = findModel(id)
  if (!m) return { baseUrl: cur.baseUrl, model: id }
  return { baseUrl: m.baseUrl, model: m.id }
}

export function applyProviderChoice(current, providerId) {
  const cur = current || {}
  const p = findProvider(providerId)
  if (!p) return { baseUrl: cur.baseUrl, model: cur.model }
  const keep = findModel(cur.model)
  const model = keep && keep.provider === p.id ? keep.id : p.defaultModel
  return { baseUrl: p.baseUrl, model }
}
