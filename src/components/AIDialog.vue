<template>
  <div class="modal-mask" @mousedown.self="$emit('close')">
    <div class="modal" @mousedown.stop>
      <div class="modal-head">
        <span class="title">🤖 {{ t('AI 智能排版') }}</span>
        <button class="x" @click="$emit('close')" :title="t('关闭')">×</button>
      </div>

      <div class="modal-body">
        <!-- 左侧：输入区 -->
        <div class="left">
          <div class="hint">
            {{ t('输入字段与风格描述，AI 帮你一键完成布局/样式/字段绑定。') }}
          </div>

          <fieldset>
            <legend>📄 {{ t('字段列表') }} <span class="muted">{{ t('一行一个，从数据源自动带入，可编辑') }}</span></legend>
            <textarea
              v-model="fieldsText"
              class="ta"
              rows="6"
              :placeholder="t('例如：\n产品名称\n规格\n价格\n条码\n生产日期')"
            ></textarea>
            <div class="row-between">
              <span class="muted">{{ t('已识别 {n} 个字段').replace('{n}', fieldsList.length) }}</span>
              <button class="link" v-if="data.fields.length" @click="importFromData">
                ⬇ {{ t('从数据源导入') }} ({{ data.fields.length }})
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>🎨 {{ t('风格描述') }} <span class="muted">{{ t('可选，影响整体观感') }}</span></legend>
            <textarea
              v-model="styleText"
              class="ta ta-sm"
              rows="3"
              :placeholder="t('例如：极简黑白、突出价格、仓库管理风格、商品零售风...')"
            ></textarea>
            <div class="presets">
              <button
                v-for="p in stylePresets"
                :key="p.key"
                class="chip"
                :class="{ active: stylePresetKey === p.key }"
                @click="applyStylePreset(p)"
              >{{ t(p.label) }}</button>
            </div>
          </fieldset>

          <fieldset>
            <legend>⚙ {{ t('模型') }}</legend>
            <div class="row-gap">
              <span class="tag">{{ ai.model }}</span>
              <span class="muted">{{ ai.baseUrl }}</span>
              <button class="link" @click="$emit('open-settings')">⚙ {{ t('设置 API Key / 模型') }}</button>
            </div>
            <div v-if="!ai.isConfigured()" class="warn">
              ⚠ {{ t('请先配置 API Key') }}
            </div>
          </fieldset>

          <div v-if="error" class="error">❌ {{ error }}</div>
        </div>

        <!-- 右侧：预览区 -->
        <div class="right">
          <div class="canvas-mock" :style="canvasStyle">
            <div
              v-for="c in components"
              :key="c.id"
              class="mock-comp"
              :class="'mock-' + c.type"
              :style="mockStyle(c)"
              :title="cTooltip(c)"
            >
              <span class="mock-name">{{ c.name }}<br><small>{{ c.type }} · {{ c.left }},{{ c.top }} {{ c.width }}×{{ c.height }}</small></span>
            </div>
            <div v-if="!components.length && !loading" class="empty-mock">
              {{ t('点击下方「生成」AI 排版') }}
            </div>
          </div>

          <div v-if="warnings.length" class="warnings">
            <div v-for="(w, i) in warnings" :key="i" class="warning">⚠ {{ w }}</div>
          </div>
        </div>
      </div>

      <div class="modal-foot">
        <span class="muted small">
          {{ t('标签尺寸') }}: {{ project.project.label.width }} × {{ project.project.label.height }} mm ·
          {{ t('将生成') }} {{ components.length }} {{ t('个组件') }}
        </span>
        <div class="spacer" />
        <button class="btn" @click="$emit('close')">{{ t('取消') }}</button>
        <button class="btn" v-if="components.length" @click="clearPreview">🗑 {{ t('清空预览') }}</button>
        <button class="btn" :disabled="loading || !ai.isConfigured()" @click="onGenerate">
          <span v-if="loading" class="spin">⏳</span>
          <span v-else>✨</span>
          {{ loading ? t('生成中…') : t('生成') }}
        </button>
        <button class="btn btn-primary" :disabled="!components.length" @click="onApply">
          ✓ {{ t('应用到画布') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { useAIStore } from '../stores/ai'
import { useI18n } from '../utils/i18n'
import { buildSystemPrompt, callChat, parseAIResponse, validateAndNormalize } from '../utils/ai'

const { t } = useI18n()
const project = useProjectStore()
const data = useDataStore()
const ai = useAIStore()

const emit = defineEmits(['close', 'open-settings', 'applied'])

const fieldsText = ref('')
const styleText = ref('')
const stylePresetKey = ref('')
const components = ref([])
const warnings = ref([])
const loading = ref(false)
const error = ref('')

const stylePresets = [
  { key: 'minimal',   label: '极简', text: '极简风格，黑白灰为主，无装饰边框，字号克制，大量留白' },
  { key: 'retail',    label: '零售', text: '零售商品标签风格，价格红色加粗突出，商品名称加黑体' },
  { key: 'warehouse', label: '仓库', text: '仓库管理风格，简洁实用，突出条码/编号/库位，灰蓝配色' },
  { key: 'fresh',     label: '生鲜', text: '生鲜食品风格，绿色主调，产地+保质期醒目，规格清晰' },
  { key: 'luxury',    label: '高端', text: '高端商品风格，深色字体+细线条分隔，衬线感强，大量留白' }
]

// 初始：若数据源已有字段，自动填入
watch(() => data.fields, (v) => {
  if (v && v.length && !fieldsText.value) {
    fieldsText.value = v.join('\n')
  }
}, { immediate: true })

const fieldsList = computed(() =>
  fieldsText.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
)

// 画布 mm → px 比例（预览缩放）
const SCALE = computed(() => {
  // 标签尺寸按 mm；预览画布固定 ~360 宽
  return Math.min(360 / Math.max(1, project.project.label.width), 8)
})
const canvasStyle = computed(() => ({
  width:  project.project.label.width  * SCALE.value + 'px',
  height: project.project.label.height * SCALE.value + 'px'
}))

function mockStyle(c) {
  return {
    left:   c.left   * SCALE.value + 'px',
    top:    c.top    * SCALE.value + 'px',
    width:  c.width  * SCALE.value + 'px',
    height: c.height * SCALE.value + 'px',
    background: c.type === 'rect' ? (c.fill || '#000') : 'rgba(99,102,241,0.10)',
    border: c.type === 'line' ? `1px solid ${c.stroke || '#000'}` : '1px dashed var(--primary)',
    color: c.type === 'rect' ? 'transparent' : 'var(--primary)',
    fontSize: Math.max(8, Math.min(12, c.height * SCALE.value * 0.7)) + 'px',
    opacity: c.type === 'rect' ? 0.6 : 0.9
  }
}
function cTooltip(c) {
  const b = c.binding ? ` → ${c.binding}` : ''
  return `${c.name} (${c.type})${b}\n${c.left},${c.top}  ${c.width}×${c.height}mm`
}

function applyStylePreset(p) {
  stylePresetKey.value = p.key
  styleText.value = t(p.text)
}
function importFromData() {
  fieldsText.value = data.fields.join('\n')
}

function clearPreview() {
  components.value = []
  warnings.value = []
  error.value = ''
}

async function onGenerate() {
  if (!ai.isConfigured()) { error.value = t('请先在设置里配置 API Key / 模型'); return }
  if (!fieldsList.value.length) { error.value = t('请至少输入一个字段'); return }
  loading.value = true
  error.value = ''
  try {
    const sys = buildSystemPrompt({
      labelWidth:  project.project.label.width,
      labelHeight: project.project.label.height,
      fields: fieldsList.value,
      style: styleText.value
    })
    const userMsg = `请为以下标签设计版式：\n\n字段：${fieldsList.value.join('、')}\n画布：${project.project.label.width}×${project.project.label.height} mm\n风格：${styleText.value || '通用美观'}\n\n请直接输出 JSON 数组。`
    const { content } = await callChat({
      baseUrl: ai.baseUrl, apiKey: ai.apiKey, model: ai.model,
      temperature: ai.temperature, maxTokens: ai.maxTokens
    }, [
      { role: 'system', content: sys },
      { role: 'user',   content: userMsg }
    ])
    const arr = parseAIResponse(content)
    const { components: comps, warnings: ws } = validateAndNormalize(arr, {
      labelWidth: project.project.label.width,
      labelHeight: project.project.label.height,
      fields: fieldsList.value
    })
    components.value = comps
    warnings.value = ws
  } catch (e) {
    error.value = e?.message || String(e)
    components.value = []
    warnings.value = []
  } finally {
    loading.value = false
  }
}

function onApply() {
  if (!components.value.length) return
  const mode = project.project.components.length
    ? confirm(t('当前画布已有 {n} 个组件。\n点「确定」= 全部替换\n点「取消」= 添加到末尾').replace('{n}', project.project.components.length))
      ? 'replace' : 'append'
    : 'replace'
  const comps = components.value.slice()
  project.batchUpdate(() => {
    if (mode === 'replace') {
      project.project.components.splice(0)
      project.clearSelection()
    }
    for (const c of comps) project.addComponent(c)
  })
  emit('applied', components.value.length)
  emit('close')
}
</script>

<style scoped>
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal {
  background: var(--bg-panel); color: var(--text);
  width: 920px; max-width: 96vw; max-height: 90vh;
  display: flex; flex-direction: column;
  border-radius: 8px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  background: linear-gradient(90deg, rgba(99,102,241,0.08), transparent);
}
.modal-head .title { font-size: 16px; font-weight: 600; }
.modal-head .x { background: none; border: 0; font-size: 22px; cursor: pointer; color: var(--text); line-height: 1; }
.modal-body { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; overflow: auto; flex: 1; }
.modal-foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg-soft); }
.spacer { flex: 1; }
.left fieldset { border: 1px solid var(--border); border-radius: 4px; padding: 8px 10px; margin: 0 0 10px; }
.left legend { padding: 0 6px; font-size: 12px; font-weight: 600; }
.muted { color: var(--text-muted); font-size: 11px; font-weight: normal; }
.small { font-size: 11px; }
.ta { width: 100%; box-sizing: border-box; padding: 6px 8px; font: inherit; font-size: 13px; background: var(--bg-soft); color: var(--text); border: 1px solid var(--border); border-radius: 3px; resize: vertical; }
.ta-sm { font-size: 12px; }
.row-between { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.row-gap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.link { background: none; border: 0; color: var(--primary); cursor: pointer; font-size: 12px; padding: 2px 4px; }
.link:hover { text-decoration: underline; }
.tag { background: var(--bg-soft); padding: 2px 8px; border-radius: 10px; font-size: 11px; font-family: monospace; }
.warn { color: #b45309; font-size: 12px; margin-top: 6px; }
.error { color: #dc2626; font-size: 13px; padding: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); border-radius: 4px; }
.presets { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.chip { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 12px; padding: 2px 10px; font-size: 11px; cursor: pointer; color: var(--text); }
.chip:hover { background: var(--primary); color: white; }
.chip.active { background: var(--primary); color: white; border-color: var(--primary); }

.right { display: flex; flex-direction: column; gap: 8px; }
.canvas-mock {
  position: relative; background: #ffffff; border: 1px solid var(--border);
  border-radius: 4px; margin: 0 auto;
  background-image:
    linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 10px 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.mock-comp { position: absolute; box-sizing: border-box; display: flex; align-items: center; justify-content: center; text-align: center; padding: 1px; line-height: 1.05; overflow: hidden; }
.mock-name { font-size: 9px; }
.mock-name small { font-size: 7px; opacity: 0.7; }
.empty-mock { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px; }
.warnings { display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow: auto; }
.warning { font-size: 11px; color: #b45309; background: rgba(245,158,11,0.08); padding: 4px 6px; border-radius: 3px; border-left: 2px solid #f59e0b; }
.hint { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.5; }

.btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border: 1px solid var(--border);
  background: var(--bg-panel); color: var(--text);
  border-radius: 4px; cursor: pointer; font-size: 13px;
}
.btn:hover:not(:disabled) { background: var(--bg-soft); border-color: var(--primary); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: white; border-color: var(--primary); }
.btn-primary:hover:not(:disabled) { background: var(--primary); filter: brightness(1.1); }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
