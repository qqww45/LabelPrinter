import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  BUILTIN_SOURCE,
  CUSTOM_SOURCE,
  DEFAULT_AI_SOURCE,
  BUILTIN_DEFAULT_ENDPOINT,
  normalizeSource,
  normalizeBuiltinEndpoint
} from '../utils/aiModels'
const KEY = 'labelprint_ai_v1'
const KEY_SESSION = 'labelprint_ai_key_session'

// DeepSeek 默认端点；Flash 支持看图纠偏
const DEFAULTS = {
  // 新用户默认用站点内置 AI，不用填 Key
  source: DEFAULT_AI_SOURCE,
  builtinEndpoint: BUILTIN_DEFAULT_ENDPOINT,
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-flash',
  apiKey: '',
  temperature: 0.4,
  maxTokens: 4096,
  // 默认不把 Key 写入 localStorage，降低 XSS / 共用电脑风险
  rememberKey: false
}

function readSessionKey() {
  try { return sessionStorage.getItem(KEY_SESSION) || '' } catch { return '' }
}
function writeSessionKey(v) {
  try {
    if (v) sessionStorage.setItem(KEY_SESSION, v)
    else sessionStorage.removeItem(KEY_SESSION)
  } catch { /* ignore */ }
}

export const useAIStore = defineStore('ai', () => {
  const source = ref(DEFAULTS.source)
  const builtinEndpoint = ref(DEFAULTS.builtinEndpoint)
  const baseUrl = ref(DEFAULTS.baseUrl)
  const model = ref(DEFAULTS.model)
  const apiKey = ref(DEFAULTS.apiKey)
  const temperature = ref(DEFAULTS.temperature)
  const maxTokens = ref(DEFAULTS.maxTokens)
  const rememberKey = ref(DEFAULTS.rememberKey)

  // 启动时恢复：设置走 localStorage；Key 默认 session，仅「记住」时才落盘
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (typeof saved.baseUrl === 'string' && saved.baseUrl) baseUrl.value = saved.baseUrl
    if (typeof saved.model === 'string' && saved.model) model.value = saved.model
    if (Number.isFinite(saved.temperature)) temperature.value = saved.temperature
    if (Number.isFinite(saved.maxTokens)) maxTokens.value = saved.maxTokens
    if (typeof saved.rememberKey === 'boolean') rememberKey.value = saved.rememberKey
    if (typeof saved.builtinEndpoint === 'string' && saved.builtinEndpoint.trim()) {
      builtinEndpoint.value = normalizeBuiltinEndpoint(saved.builtinEndpoint)
    }
    // 兼容旧版：以前明文存了 apiKey → 视为用户曾选择记住
    if (typeof saved.apiKey === 'string' && saved.apiKey) {
      rememberKey.value = true
      apiKey.value = saved.apiKey
    } else {
      apiKey.value = readSessionKey()
    }
    // 老用户没存过来源：填过 Key 的留在自定义，其余升到内置
    source.value = typeof saved.source === 'string'
      ? normalizeSource(saved.source)
      : (apiKey.value ? CUSTOM_SOURCE : BUILTIN_SOURCE)
  } catch (e) { /* 忽略 */ }

  function persist() {
    try {
      const payload = {
        source: source.value,
        builtinEndpoint: builtinEndpoint.value,
        baseUrl: baseUrl.value,
        model: model.value,
        temperature: temperature.value,
        maxTokens: maxTokens.value,
        rememberKey: rememberKey.value
      }
      if (rememberKey.value) {
        payload.apiKey = apiKey.value
        writeSessionKey('')
      } else {
        writeSessionKey(apiKey.value)
      }
      localStorage.setItem(KEY, JSON.stringify(payload))
    } catch (e) { /* 忽略 */ }
  }

  /** 内置端点免 Key，只要有来源就算可用 */
  const isConfigured = () => {
    if (source.value === BUILTIN_SOURCE) return true
    return !!(apiKey.value && baseUrl.value && model.value)
  }

  const isBuiltin = () => source.value === BUILTIN_SOURCE

  /**
   * 只换模型名，不改 Base URL。
   * 一个 API Key 对应一家服务商；跨厂商请到设置里换「服务商」。
   */
  function setModel(id) {
    const next = String(id || '').trim()
    if (!next) return
    model.value = next
    persist()
  }

  function setSource(id) {
    source.value = normalizeSource(id)
    persist()
  }

  return {
    source, builtinEndpoint, baseUrl, model, apiKey, temperature, maxTokens, rememberKey,
    persist, isConfigured, isBuiltin, setModel, setSource
  }
})
