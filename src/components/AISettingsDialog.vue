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
          {{ t('API Key 默认只存在本标签页会话，不上传服务器。勾选「记住」才会写入本机。') }}
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
          <legend>🌐 {{ t('Base URL') }}</legend>
          <input v-model="local.baseUrl" class="input" placeholder="https://api.deepseek.com/v1" />
          <div class="presets">
            <button
              v-for="p in providers"
              :key="p.baseUrl"
              class="chip"
              :class="{ active: local.baseUrl === p.baseUrl }"
              @click="applyProvider(p)"
            >{{ p.name }}</button>
          </div>
        </fieldset>

        <fieldset>
          <legend>🧠 {{ t('模型名') }}</legend>
          <input v-model="local.model" class="input" placeholder="deepseek-chat" />
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
import { ref } from 'vue'
import { useAIStore } from '../stores/ai'
import { useI18n } from '../utils/i18n'
import { callChat } from '../utils/ai'

const { t } = useI18n()
const ai = useAIStore()
const emit = defineEmits(['close'])

const showKey = ref(false)
const testing = ref(false)
const testResult = ref(null)

const local = ref({
  apiKey: ai.apiKey,
  baseUrl: ai.baseUrl,
  model: ai.model,
  temperature: ai.temperature,
  maxTokens: ai.maxTokens,
  rememberKey: ai.rememberKey
})

const providers = [
  { name: 'DeepSeek',     baseUrl: 'https://api.deepseek.com/v1',        model: 'deepseek-chat' },
  { name: '智谱 GLM',     baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: '阿里 Qwen',    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: '月之暗面',     baseUrl: 'https://api.moonshot.cn/v1',         model: 'moonshot-v1-8k' },
  { name: 'OpenAI',       baseUrl: 'https://api.openai.com/v1',          model: 'gpt-4o-mini' },
  { name: 'Ollama (本地)', baseUrl: 'http://localhost:11434/v1',          model: 'qwen2.5:7b' }
]

function applyProvider(p) {
  local.value.baseUrl = p.baseUrl
  local.value.model = p.model
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
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1100; }
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
.input { flex: 1; padding: 6px 8px; background: var(--bg-soft); color: var(--text); border: 1px solid var(--border); border-radius: 3px; font: inherit; }
.input-num { max-width: 120px; }
.btn-mini { padding: 4px 8px; background: var(--bg-soft); color: var(--text); border: 1px solid var(--border); border-radius: 3px; cursor: pointer; font-size: 12px; }
.presets { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.chip { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 12px; padding: 2px 10px; font-size: 11px; cursor: pointer; color: var(--text); }
.chip:hover { background: var(--primary); color: white; }
.chip.active { background: var(--primary); color: white; border-color: var(--primary); }
.status { padding: 8px 12px; border-radius: 4px; font-size: 13px; margin-top: 8px; }
.status.ok { background: rgba(34,197,94,0.1); color: #15803d; border: 1px solid rgba(34,197,94,0.3); }
.status.err { background: rgba(239,68,68,0.1); color: #dc2626; border: 1px solid rgba(239,68,68,0.3); }
.status.pending { background: var(--bg-soft); color: var(--text-muted); border: 1px solid var(--border); }
.btn { padding: 6px 12px; border: 1px solid var(--border); background: var(--bg-panel); color: var(--text); border-radius: 4px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
.btn:hover:not(:disabled) { background: var(--bg-soft); border-color: var(--primary); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: white; border-color: var(--primary); }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.small { font-size: 11px; }
</style>
