<template>
  <aside class="ai-dock" :class="{ embedded }">
    <div v-if="!embedded" class="dock-head">
      <span class="title">🤖 {{ t('AI 调整') }}</span>
      <button class="icon-btn" type="button" @click="$emit('open-settings')" :title="t('设置 API Key / 模型')" :aria-label="t('设置 API Key / 模型')">⚙</button>
      <button class="icon-btn" type="button" @click="$emit('close')" :title="t('隐藏')" :aria-label="t('隐藏')">⟨</button>
    </div>
    <div v-else class="dock-tools">
      <button class="icon-btn" type="button" @click="$emit('open-settings')" :title="t('设置 API Key / 模型')" :aria-label="t('设置 API Key / 模型')">⚙ {{ t('API 设置') }}</button>
    </div>

    <div class="mode-switch">
      <button class="chip" :class="{ active: mode === 'adjust' }" @click="mode = 'adjust'">{{ t('调整当前') }}</button>
      <button class="chip" :class="{ active: mode === 'generate' }" @click="mode = 'generate'">{{ t('生成新布局') }}</button>
    </div>

    <div class="chat" ref="chatEl">
      <p v-if="!chat.length" class="hint">
        {{ mode === 'adjust'
          ? t('对着已有项目微调。AI 会先读布局、已导入的数据、打印设置和纸张排版，再只改你提到的地方。')
          : t('输入字段与风格描述，AI 帮你一键完成布局/样式/字段绑定。') }}
      </p>
      <p v-if="mode === 'adjust'" class="hint">{{ adjustReads }}</p>
      <div v-for="(m, i) in chat" :key="i" class="bubble" :class="m.role">{{ m.text }}</div>
      <div v-if="planLines.length && canApplyPlan" class="plan-lines">
        <div v-for="(line, i) in planLines" :key="i" class="plan-line">{{ line }}</div>
        <button class="btn btn-primary" @click="applyPlan()">{{ t('应用到画布') }}</button>
      </div>
      <div v-if="warnings.length" class="warnings">
        <div v-for="(w, i) in warnings" :key="i" class="warning">⚠ {{ w }}</div>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="!ai.isConfigured()" class="warn">⚠ {{ t('请先配置 API Key') }}</div>
    </div>

    <div v-if="mode === 'generate'" class="generate-box">
      <textarea v-model="fieldsText" class="ta" rows="4" :placeholder="t('例如：\n产品名称\n规格\n价格\n条码\n生产日期')"></textarea>
      <div class="row-between">
        <span class="muted">{{ t('已识别 {n} 个字段').replace('{n}', fieldsList.length) }}</span>
        <button class="link" v-if="data.fields.length" @click="importFromData">⬇ {{ t('从数据源导入') }} ({{ data.fields.length }})</button>
      </div>
      <div class="presets">
        <button v-for="p in stylePresets" :key="p.key" class="chip" :class="{ active: stylePresetKey === p.key }" @click="applyStylePreset(p)">{{ t(p.label) }}</button>
      </div>
    </div>

    <form class="composer" @submit.prevent="onGenerate">
      <div v-if="mode === 'adjust'" class="presets">
        <button v-for="h in talkHints" :key="h.text" class="chip" type="button" @click="instruction = t(h.text)">{{ t(h.label) }}</button>
      </div>
      <textarea
        v-if="mode === 'adjust'"
        v-model="instruction"
        class="ta"
        rows="3"
        :placeholder="t('例如：价格改成红色大字；规格为空时不打印；按份数列打印')"
        @keydown.enter.exact.prevent="onGenerate"
      ></textarea>
      <div class="composer-row">
        <span class="muted">{{ ai.model }}</span>
        <button class="btn btn-primary" type="submit" :disabled="loading || !ai.isConfigured() || (mode === 'generate' && !fieldsList.length)">
          {{ loading ? t('生成中…') : (mode === 'adjust' ? t('发送') : t('生成')) }}
        </button>
        <button v-if="mode === 'generate' && components.length" class="btn" type="button" @click="onApply">{{ t('应用到画布') }}</button>
      </div>
    </form>
  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { useAIStore } from '../stores/ai'
import { useI18n } from '../utils/i18n'
import { toastInfo } from '../utils/toast'
import { buildSystemPrompt, buildAdjustPrompt, buildAdjustMessages, packAdjustContext, callChat, parseAIResponse, parseAIPlan, validateAndNormalize, normalizeAdjustPlan, adjustPlanIsEmpty, describeAdjustPlan } from '../utils/ai'

const { t } = useI18n()
defineProps({
  /** 嵌在 LeftDock 时：标题/收起由外层负责 */
  embedded: { type: Boolean, default: false }
})
const project = useProjectStore()
const data = useDataStore()
const ai = useAIStore()

const emit = defineEmits(['close', 'open-settings', 'applied'])

const fieldsText = ref('')
const styleText = ref('')
const mode = ref('adjust')
const instruction = ref('')
const plan = ref(null)
const chat = ref([])
const chatEl = ref(null)
const stylePresetKey = ref('')
const components = ref([])
const warnings = ref([])
const loading = ref(false)
const error = ref('')

const talkHints = [
  { label: '这个放大', text: '把选中的组件放大，字也加大' },
  { label: '空了不印', text: '内容为空的组件不打印' },
  { label: '换成条码', text: '把选中的二维码改成条形码，绑定的内容保持不变' },
  { label: '价格标红', text: '价格改成红色大字' }
]
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
const planLines = computed(() => describeAdjustPlan(plan.value))
const canApplyPlan = computed(() => plan.value && !adjustPlanIsEmpty(plan.value))
const adjustReads = computed(() => {
  const p = project.project
  const L = p.layout || {}
  const sheet = L.mode === 'auto'
    ? t('{c} 列 × {r} 行', { c: L.cols || 1, r: L.rows || 1 })
    : t('单张')
  const sel = project.selectedIds
    .map(id => p.components.find(c => c.id === id))
    .filter(Boolean)
    .map(c => c.name || c.type)
  const base = t('将读取：布局 {n} 个组件，数据 {rows} 行，打印设置，排版 {sheet}（纸张 {w}×{h} mm）。', {
    n: p.components.length,
    rows: data.rows.length,
    sheet,
    w: p.paper?.width,
    h: p.paper?.height
  })
  return sel.length ? base + t('当前选中：{name}。说「这个」就会改它。', { name: sel.join('、') }) : base
})

function scrollChat() {
  nextTick(() => {
    const el = chatEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function planTouchesData(next) {
  const d = next?.data
  if (!d) return false
  return !!(d.addColumns?.length || d.renameColumns?.length || d.removeColumns?.length || d.setColumn?.length || d.setCells?.length)
}

watch(mode, () => {
  plan.value = null
  warnings.value = []
  error.value = ''
})

function applyStylePreset(p) {
  stylePresetKey.value = p.key
  styleText.value = t(p.text)
}
function importFromData() {
  fieldsText.value = data.fields.join('\n')
}

async function onGenerate() {
  if (!ai.isConfigured()) { error.value = t('请先在设置里配置 API Key / 模型'); return }
  if (mode.value === 'adjust') return onAdjust()
  if (!fieldsList.value.length) { error.value = t('请至少输入一个字段'); return }
  loading.value = true
  error.value = ''
  plan.value = null
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
    chat.value.push({ role: 'ai', text: t('已生成 {n} 个组件，点「应用到画布」就能在旁边看到。', { n: comps.length }) })
    scrollChat()
  } catch (e) {
    error.value = e?.message || String(e)
    components.value = []
    warnings.value = []
  } finally {
    loading.value = false
  }
}

async function onAdjust() {
  if (!instruction.value.trim()) { error.value = t('先写要改什么'); return }
  loading.value = true
  error.value = ''
  components.value = []
  try {
    const packed = packAdjustContext({
      project: project.project,
      rows: data.rows,
      fields: data.fields.length ? data.fields : fieldsList.value,
      selectedIds: project.selectedIds
    })
    const sys = buildAdjustPrompt(packed)
    const said = instruction.value.trim()
    const { content } = await callChat({
      baseUrl: ai.baseUrl, apiKey: ai.apiKey, model: ai.model,
      temperature: Math.min(ai.temperature ?? 0.4, 0.3), maxTokens: ai.maxTokens
    }, buildAdjustMessages(sys, chat.value, said + (styleText.value.trim() ? `\n风格偏好：${styleText.value.trim()}` : '')))
    const raw = parseAIPlan(content)
    const { plan: next, warnings: ws } = normalizeAdjustPlan(raw, {
      labelWidth: project.project.label.width,
      labelHeight: project.project.label.height,
      fields: data.fields.length ? data.fields : fieldsList.value,
      components: project.project.components,
      rowCount: data.rows.length,
      selectedIds: project.selectedIds
    })
    chat.value.push({ role: 'user', text: said })
    instruction.value = ''
    plan.value = next
    components.value = next.componentAdds
    warnings.value = ws
    if (adjustPlanIsEmpty(next)) {
      chat.value.push({ role: 'ai', text: ws.filter(Boolean).join('\n') || t('没有可应用的改动') })
    } else {
      chat.value.push({ role: 'ai', text: next.summary || describeAdjustPlan(next).join('；') })
      if (!planTouchesData(next)) {
        applyPlan({ quiet: true })
        chat.value.push({ role: 'ai', text: t('已改到画布上，旁边就能看到。布局和打印可以用 Ctrl+Z 撤回。') })
      }
    }
    scrollChat()
  } catch (e) {
    error.value = e?.message || String(e)
    plan.value = null
    warnings.value = []
  } finally {
    loading.value = false
  }
}

function applyDataOps(ops) {
  const notes = []
  for (const name of ops.addColumns || []) {
    try { data.addColumn(name) } catch (e) { notes.push(e.message) }
  }
  for (const item of ops.renameColumns || []) {
    try { data.renameColumn(item.from, item.to) } catch (e) { notes.push(e.message) }
  }
  for (const name of ops.removeColumns || []) {
    try { data.removeColumn(name) } catch (e) { notes.push(e.message) }
  }
  for (const item of ops.setColumn || []) {
    if (!data.headers.includes(item.column)) { notes.push(item.column); continue }
    for (const row of data.rows) data.updateRow(row.__id, { [item.column]: item.value })
  }
  for (const cell of ops.setCells || []) {
    const row = data.rows[cell.row - 1]
    if (!row || !data.headers.includes(cell.column)) continue
    data.updateRow(row.__id, { [cell.column]: cell.value })
  }
  return notes
}

function onApply() {
  if (mode.value === 'adjust') return applyPlan()
  if (!components.value.length) return
  const applyMode = project.project.components.length
    ? confirm(t('当前画布已有 {n} 个组件。\n点「确定」= 全部替换\n点「取消」= 添加到末尾').replace('{n}', project.project.components.length))
      ? 'replace' : 'append'
    : 'replace'
  const comps = components.value.slice()
  project.batchUpdate(() => {
    if (applyMode === 'replace') {
      project.project.components.splice(0)
      project.clearSelection()
    }
    for (const c of comps) project.addComponent(c)
  })
  emit('applied', components.value.length)
  chat.value.push({ role: 'ai', text: t('已改到画布上，旁边就能看到。布局和打印可以用 Ctrl+Z 撤回。') })
  components.value = []
  scrollChat()
}

function applyPlan(opts = {}) {
  const next = plan.value
  if (!next || adjustPlanIsEmpty(next)) return
  if (planTouchesData(next) && !opts.quiet) {
    const ask = describeAdjustPlan(next).join('\n') + '\n\n' + t('数据改动不能用 Ctrl+Z 撤回。布局和打印设置可以。')
    if (!confirm(ask)) return
  }
  const notes = applyDataOps(next.data || {})
  project.batchUpdate(() => {
    for (const id of next.componentRemoves) project.removeComponent(id)
    for (const item of next.componentUpdates) {
      if (project.project.components.some(c => c.id === item.id)) project.updateComponent(item.id, item.patch)
    }
    for (const c of next.componentAdds) project.addComponent(c)
    if (next.sheet?.paper) project.updatePaper(next.sheet.paper)
    if (next.sheet?.margin) project.updateMargin(next.sheet.margin)
    if (next.sheet?.label) project.updateLabel(next.sheet.label)
    if (next.sheet?.layout) project.updateLayout(next.sheet.layout)
    if (next.print) Object.assign(project.project.printConfig, next.print)
    if (next.order?.length) {
      const moving = new Set(next.order)
      const stay = project.project.components.filter(c => !moving.has(c.id))
      const raised = next.order.map(id => project.project.components.find(c => c.id === id)).filter(Boolean)
      project.project.components.splice(0, project.project.components.length, ...stay, ...raised)
    }
    if (next.data?.fieldMap?.length) {
      const map = { ...(project.project.dataSource.fieldMap || {}) }
      for (const item of next.data.fieldMap) map[item.from] = item.to
      project.updateFieldMap(map)
    }
  })
  plan.value = null
  if (notes.length) toastInfo(notes.join('\n'), 5200)
  emit('applied', next.componentAdds.length + next.componentUpdates.length)
}
</script>

<style scoped>
.ai-dock {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  color: var(--text);
  min-width: 0;
}
.dock-head {
  flex-shrink: 0;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-bottom: 1px solid var(--border);
}
.dock-head .title { flex: 1; font-size: 12px; font-weight: 600; }
.dock-tools {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 6px 10px 0;
}
.dock-tools .icon-btn {
  width: auto;
  height: 26px;
  padding: 0 8px;
  font-size: 11px;
  gap: 4px;
  display: inline-flex;
  align-items: center;
}
.icon-btn {
  width: 22px; height: 22px;
  border: 0; background: transparent; color: var(--text-secondary);
  border-radius: 4px; cursor: pointer;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--primary); }
.icon-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.mode-switch { display: flex; gap: 6px; padding: 8px 10px 0; }
.chat { flex: 1; overflow: auto; padding: 8px 10px; display: flex; flex-direction: column; gap: 8px; }
.hint { font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5; }
.bubble { font-size: 13px; line-height: 1.45; padding: 6px 8px; border-radius: 6px; white-space: pre-wrap; }
.bubble.user { align-self: flex-end; max-width: 92%; background: rgba(37,99,235,0.12); }
.bubble.ai { align-self: flex-start; max-width: 100%; background: var(--bg); border: 1px solid var(--border); }
.generate-box { padding: 0 10px 8px; border-top: 1px solid var(--border); }
.composer { flex-shrink: 0; padding: 8px 10px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
.composer-row { display: flex; align-items: center; gap: 6px; }
.composer-row .muted { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.muted { color: var(--text-muted); font-size: 11px; }
.ta { width: 100%; box-sizing: border-box; padding: 6px 8px; font: inherit; font-size: 13px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; resize: vertical; }
.row-between { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.link { background: none; border: 0; color: var(--primary); cursor: pointer; font-size: 12px; padding: 2px 4px; }
.warn { color: #b45309; font-size: 12px; }
.error { color: #dc2626; font-size: 13px; padding: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); border-radius: 4px; }
.presets { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.chip { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 2px 10px; font-size: 11px; cursor: pointer; color: var(--text); }
.chip.active { background: var(--primary); color: white; border-color: var(--primary); }
.warnings { display: flex; flex-direction: column; gap: 4px; }
.warning { font-size: 11px; color: #b45309; background: rgba(245,158,11,0.08); padding: 4px 6px; border-radius: 3px; }
.plan-lines { display: flex; flex-direction: column; gap: 4px; }
.plan-line { font-size: 12px; background: rgba(37,99,235,0.08); padding: 4px 6px; border-radius: 3px; }
.btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border: 1px solid var(--border);
  background: var(--bg-panel); color: var(--text);
  border-radius: 4px; cursor: pointer; font-size: 12px;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: white; border-color: var(--primary); }
</style>
