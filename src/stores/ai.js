import { defineStore } from 'pinia'
import { ref } from 'vue'

const KEY = 'labelprint_ai_v1'

// DeepSeek 默认端点
const DEFAULTS = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  apiKey: '',
  temperature: 0.4,
  maxTokens: 4096
}

export const useAIStore = defineStore('ai', () => {
  const baseUrl = ref(DEFAULTS.baseUrl)
  const model = ref(DEFAULTS.model)
  const apiKey = ref(DEFAULTS.apiKey)
  const temperature = ref(DEFAULTS.temperature)
  const maxTokens = ref(DEFAULTS.maxTokens)

  // 启动时从 localStorage 恢复
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (typeof saved.baseUrl === 'string' && saved.baseUrl) baseUrl.value = saved.baseUrl
    if (typeof saved.model === 'string' && saved.model) model.value = saved.model
    if (typeof saved.apiKey === 'string') apiKey.value = saved.apiKey
    if (Number.isFinite(saved.temperature)) temperature.value = saved.temperature
    if (Number.isFinite(saved.maxTokens)) maxTokens.value = saved.maxTokens
  } catch (e) { /* 忽略 */ }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        baseUrl: baseUrl.value, model: model.value, apiKey: apiKey.value,
        temperature: temperature.value, maxTokens: maxTokens.value
      }))
    } catch (e) { /* 忽略 */ }
  }

  const isConfigured = () => !!(apiKey.value && baseUrl.value && model.value)

  return { baseUrl, model, apiKey, temperature, maxTokens, persist, isConfigured }
})
