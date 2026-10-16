<template>
  <div class="modal-mask" @mousedown.self="$emit('close')">
    <div class="modal" @mousedown.stop>
      <div class="modal-head">
        <span class="title">⚙ {{ t('AI 设置') }}</span>
        <button class="x" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="hint">
          {{ t('本工具使用 OpenAI 兼容协议，支持 DeepSeek / 智谱 GLM / 阿里 Qwen / OpenAI / Ollama 等。') }}<br>
          {{ t('API Key 默认只存在本标签页会话，不上传服务器。勾选「记住」才会写入本机。') }}<br>
          {{ t('附图看实打效果请选带「可看图」的模型。DeepSeek 推荐 deepseek-flash。') }}<br>
          {{ t('一次只配置一家服务商的 API Key。换厂商请先改「服务商」，再填对应的 Key。') }}
        </div>

        <fieldset>
          <legend>🔑 {{ t('API Key') }}</legend>
          <div class="row">
            <input
              :type="showKey ? 'text' : 'password'"
              v-model="local.apiKey"
              class="input"
              :placeholder="t('sk-...')"
              autocomplete="off"
              spellcheck="false"
            />
            <button class="btn-mini" type="button" @click="showKey = !showKey">{{ showKey ? t('隐藏') : t('显示') }}</button>
          </div>
          <label class="remember">
            <input type="checkbox" v-model="local.rememberKey" />
            {{ t('记住 API Key（保存在本浏览器，共用电脑请勿勾选）') }}
          </label>
        </fieldset>

        <fieldset>
          <legend>🌐 {{ t('服务商') }}</legend>
          <select class="input" :value="providerSelect" :aria-label="t('服务商')" @change="onProviderChange">
            <option v-for="p in providers" :key="p.id" :value="p.id">{{ p.name }}</option>
            <option :value="CUSTOM_MODEL_VALUE">{{ t('自定义 Base URL') }}</option>
          </select>
          <input
            v-if="providerSelect === CUSTOM_MODEL_VALUE"
            v-model="local.baseUrl"
            class="input mt"
            placeholder="https://api.deepseek.com/v1"
            :aria-label="t('Base URL')"
          />
          <p v-else class="muted url-line">{{ local.baseUrl }}</p>
        </fieldset>

        <fieldset>
          <legend>🧠 {{ t('模型') }}</legend>
          <select class="input" :value="modelSelect" :aria-label="t('模型')" @change="onModelSelectChange">
            <optgroup v-if="providerModels.length" :label="providerGroupLabel">
              <option v-for="m in providerModels" :key="m.id" :value="m.id">{{ m.label }}</option>
            </optgroup>
            <option v-if="orphanModel" :value="orphanModel">{{ orphanModel }}（{{ t('当前') }}）</option>
            <option :value="CUSTOM_MODEL_VALUE">{{ t('自定义模型名…') }}</option>
          </select>
          <input
            v-if="modelSelect === CUSTOM_MODEL_VALUE"
            v-model="local.model"
            class="input mt"
            :placeholder="t('填写接口要求的模型名')"
            :aria-label="t('自定义模型名')"
          />
          <p class="muted mt">{{ visionHint }}</p>
        </fieldset>

        <fieldset>
          <legend>🎛 {{ t('高级') }}</legend>
          <div class="row">
            <label class="lbl">{{ t('温度') }} ({{ local.temperature }})</label>
            <input type="range" min="0" max="1.5" step="0.1" v-model.number="local.temperature" />
            <span class="muted">{{ t('低=更稳定，高=更有创意') }}</span>
          </div>
          <div class="row">
            <label class="lbl">{{ t('最大 token') }}</label>
            <input type="number" v-model.number="local.maxTokens" min="512" max="8192" step="256" class="input input-num" />
          </div>
        </fieldset>

        <div class="status" :class="testResult.kind" v-if="testResult">
          <span v-if="testResult.kind === 'pending'" class="spin">⏳</span>
          <span v-else-if="testResult.kind === 'ok'">✅</span>
          <span v-else>❌</span>
          {{ testResult.msg }}
        </div>
      </div>

      <div class="modal-foot">
        <span class="muted small">{{ t('设置已自动保存') }}</span>
        <div class="spacer" />
        <button class="btn" @click="onTest" :disabled="!local.apiKey || testing">
          <span v-if="testing" class="spin">⏳</span>
          {{ t('测试连接') }}
        </button>
        <button class="btn" @click="$emit('close')">{{ t('关闭') }}</button>
        <button class="btn btn-primary" @click="onSave">{{ t('保存') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAIStore } from '../stores/ai'
import { useI18n } from '../utils/i18n'
import { callChat } from '../utils/ai'
import {
  AI_PROVIDERS,
  CUSTOM_MODEL_VALUE,
  applyProviderChoice,
  findModel,
  isKnownModel,
  modelSupportsVision,
  modelsForProvider,
  providerByBaseUrl
} from '../utils/aiModels'

const { t } = useI18n()
const ai = useAIStore()
const emit = defineEmits(['close'])

const showKey = ref(false)
const testing = ref(false)
const testResult = ref(null)
const customModelMode = ref(!isKnownModel(ai.model))

const local = ref({
  apiKey: ai.apiKey,
  baseUrl: ai.baseUrl,
  model: ai.model,
  temperature: ai.temperature,
  maxTokens: ai.maxTokens,
  rememberKey: ai.rememberKey
})

const providers = AI_PROVIDERS

const providerSelect = computed(() => {
  const p = providerByBaseUrl(local.value.baseUrl)
  return p ? p.id : CUSTOM_MODEL_VALUE
})

const providerModels = computed(() => {
  const p = providerByBaseUrl(local.value.baseUrl)
  return p ? modelsForProvider(p.id) : []
})

const providerGroupLabel = computed(() => {
  const p = providerByBaseUrl(local.value.baseUrl)
  return p ? p.name : t('模型')
})

const modelSelect = computed(() => {
  if (customModelMode.value) return CUSTOM_MODEL_VALUE
  if (isKnownModel(local.value.model)) return local.value.model
  return CUSTOM_MODEL_VALUE
})

const orphanModel = computed(() => {
  const id = local.value.model
  if (!id || isKnownModel(id)) return ''
  if (customModelMode.value) return ''
  return id
})

const visionHint = computed(() => {
  if (modelSupportsVision(local.value.model)) return t('当前模型可看图（附图纠偏可用）')
  if (findModel(local.value.model)) return t('当前模型为纯文本，附图看不了')
  return t('自定义模型是否支持看图，取决于服务商说明')
})

function onProviderChange(e) {
  const id = e.target.value
  if (id === CUSTOM_MODEL_VALUE) {
    customModelMode.value = !isKnownModel(local.value.model)
    return
  }
  const next = applyProviderChoice(local.value, id)
  local.value.baseUrl = next.baseUrl
  local.value.model = next.model
  customModelMode.value = false
}

function onModelSelectChange(e) {
  const id = e.target.value
  if (id === CUSTOM_MODEL_VALUE) {
    customModelMode.value = true
    return
  }
  customModelMode.value = false
  // 列表已按当前服务商过滤，只改模型名，不动 Base URL / Key
  local.value.model = id
}

async function onTest() {
  testing.value = true
  testResult.value = { kind: 'pending', msg: t('正在测试…') }
  try {
    const { content } = await callChat({
      baseUrl: local.value.baseUrl,
      apiKey: local.value.apiKey,
      model: local.value.model,
      temperature: 0.1,
      maxTokens: 64
    }, [
      { role: 'user', content: '回 OK' }
    ])
    testResult.value = { kind: 'ok', msg: t('连接成功（返回: {n} 字符）').replace('{n}', content.length) }
  } catch (e) {
    testResult.value = { kind: 'err', msg: e?.message || String(e) }
  } finally {
    testing.value = false
  }
}

function onSave() {
  ai.apiKey = local.value.apiKey
  ai.baseUrl = local.value.baseUrl
  ai.model = local.value.model
  ai.temperature = local.value.temperature
  ai.maxTokens = local.value.maxTokens
  ai.rememberKey = !!local.value.rememberKey
  ai.persist()
  emit('close')
}
</script>

<style scoped>
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1100; overscroll-behavior: contain; }
.modal { background: var(--bg-panel); color: var(--text); width: 540px; max-width: 96vw; max-height: 90vh; display: flex; flex-direction: column; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); }
.modal-head .title { font-size: 16px; font-weight: 600; }
.modal-head .x { background: none; border: 0; font-size: 22px; cursor: pointer; color: var(--text); }
.modal-body { padding: 16px; overflow: auto; flex: 1; }
.modal-foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); }
.spacer { flex: 1; }
.hint { font-size: 12px; color: var(--text-muted); line-height: 1.6; margin-bottom: 12px; }
.remember {
  display: flex; align-items: flex-start; gap: 8px;
  margin-top: 8px; font-size: 12px; color: var(--text-secondary); cursor: pointer; line-height: 1.4;
}
.remember input { margin-top: 2px; }
fieldset { border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; margin: 0 0 12px; }
legend { padding: 0 6px; font-size: 12px; font-weight: 600; }
.row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
.lbl { font-size: 12px; min-width: 80px; }
.muted { color: var(--text-muted); font-size: 11px; }
.url-line { margin: 6px 0 0; word-break: break-all; }
.mt { margin-top: 8px; }
.input { flex: 1; width: 100%; box-sizing: border-box; padding: 6px 8px; background: var(--bg-soft); color: var(--text); border: 1px solid var(--border); border-radius: 3px; font: inherit; }
.input:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.input-num { max-width: 120px; }
.btn-mini { padding: 4px 8px; background: var(--bg-soft); color: var(--text); border: 1px solid var(--border); border-radius: 3px; cursor: pointer; font-size: 12px; }
.status { padding: 8px 12px; border-radius: 4px; font-size: 13px; margin-top: 8px; }
.status.ok { background: rgba(34,197,94,0.1); color: #15803d; border: 1px solid rgba(34,197,94,0.3); }
.status.err { background: rgba(239,68,68,0.1); color: #dc2626; border: 1px solid rgba(239,68,68,0.3); }
.status.pending { background: var(--bg-soft); color: var(--text-muted); border: 1px solid var(--border); }
.btn { padding: 6px 12px; border: 1px solid var(--border); background: var(--bg-panel); color: var(--text); border-radius: 4px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
.btn:hover:not(:disabled) { background: var(--bg-soft); border-color: var(--primary); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.btn-primary { background: var(--primary); color: white; border-color: var(--primary); }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; }
}
.small { font-size: 11px; }
</style>
