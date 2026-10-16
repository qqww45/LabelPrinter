import { defineStore } from 'pinia'
import { ref } from 'vue'

const KEY = 'labelprint_ai_v1'
const KEY_SESSION = 'labelprint_ai_key_session'

// DeepSeek 默认端点
const DEFAULTS = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
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
    // 兼容旧版：以前明文存了 apiKey → 视为用户曾选择记住
    if (typeof saved.apiKey === 'string' && saved.apiKey) {
      rememberKey.value = true
      apiKey.value = saved.apiKey
    } else {
      apiKey.value = readSessionKey()
    }
  } catch (e) { /* 忽略 */ }

  function persist() {
    try {
      const payload = {
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

  const isConfigured = () => !!(apiKey.value && baseUrl.value && model.value)

  return {
    baseUrl, model, apiKey, temperature, maxTokens, rememberKey,
    persist, isConfigured
  }
})
