<template>
  <aside class="ai-dock" :class="{ embedded }">
    <div v-if="!embedded" class="dock-head">
      <span class="title">{{ t('AI 调整') }}</span>
      <button class="icon-btn" type="button" @click="$emit('close')" :title="t('隐藏')" :aria-label="t('隐藏')">⟨</button>
    </div>

    <div class="chat" ref="chatEl">
      <p v-if="!chat.length" class="hint">
        {{ t('对着已有项目微调。AI 会先读布局、已导入的数据、打印设置和纸张排版，再只改你提到的地方。') }}
      </p>
      <p v-if="!chat.length" class="hint soft">{{ adjustReads }}</p>
      <p v-if="!chat.length && isBuiltin" class="hint soft">
        {{ t('正在用内置 AI（免 Key）。想「看图纠偏」或换更强模型，去设置里切成自定义。') }}
      </p>
      <div v-for="(m, i) in chat" :key="i" class="bubble" :class="m.role">
        <img v-if="m.image" class="bubble-img" :src="m.image" alt="" />
        <span>{{ m.text }}</span>
      </div>
      <div v-if="planLines.length && canApplyPlan" class="plan-lines">
        <div v-for="(line, i) in planLines" :key="i" class="plan-line">{{ line }}</div>
        <button class="btn btn-primary" type="button" @click="applyPlan()">{{ t('应用到画布') }}</button>
      </div>
      <div v-if="warnings.length" class="warnings">
        <div v-for="(w, i) in warnings" :key="i" class="warning">⚠ {{ w }}</div>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="!ai.isConfigured()" class="warn">⚠ {{ t('请先配置 API Key') }}</div>
    </div>

    <form class="composer" @submit.prevent="onAdjust">
      <div class="presets" role="group" :aria-label="t('快捷指令')">
        <button
          v-for="h in talkHints"
          :key="h.text"
          class="chip"
          type="button"
          @click="instruction = t(h.text)"
        >{{ t(h.label) }}</button>
      </div>

      <div
        class="composer-shell"
        :class="{ 'is-drag': dragOver, 'has-image': !!attachPreview }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDropFiles"
      >
        <input
          ref="imageInput"
          class="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          @change="onPickImage"
        />

        <div v-if="attachPreview" class="attach-chip">
          <img :src="attachPreview" alt="" />
          <button class="attach-x" type="button" :aria-label="t('移除附图')" @click="clearAttach">×</button>
        </div>

        <textarea
          v-model="instruction"
          class="ta shell-ta"
          rows="3"
          :placeholder="t('说要改什么… 可 Ctrl+V 粘贴实打照片')"
          @paste="onPaste"
          @keydown.enter.exact.prevent="onAdjust"
        ></textarea>

        <div class="shell-bar">
          <button
            class="icon-tool"
            type="button"
            :disabled="loading"
            :title="t('选择图片，或在框内粘贴')"
            :aria-label="t('选择图片，或在框内粘贴')"
            @click="imageInput?.click()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21.4 11.6 12.1 20.9a5.5 5.5 0 0 1-7.8-7.8l9.9-9.9a3.5 3.5 0 0 1 5 5l-9.9 9.9a1.5 1.5 0 0 1-2.1-2.1l8.5-8.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <label v-if="!isBuiltin" class="model-pick">
            <span class="sr-only">{{ t('模型') }}</span>
            <select
              class="model-select"
              :value="dialogModelValue"
              :aria-label="t('更换模型')"
              :disabled="loading || !providerModels.length"
              @change="onDialogModelChange"
            >
              <option v-for="m in providerModels" :key="m.id" :value="m.id">{{ shortModelLabel(m) }}</option>
              <option v-if="unknownDialogModel" :value="unknownDialogModel">{{ unknownDialogModel }}</option>
            </select>
          </label>

          <button
            class="icon-tool"
            type="button"
            :title="t('API 设置')"
            :aria-label="t('API 设置')"
            @click="$emit('open-settings')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.75"/>
              <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </svg>
          </button>

          <button class="btn btn-primary send" type="submit" :disabled="loading || !ai.isConfigured()">
            {{ loading ? t('生成中…') : t('发送') }}
          </button>
        </div>
      </div>

      <p v-if="attachPreview && !currentModelVision" class="vision-warn" role="status">
        {{ t('当前模型不能看图，请换成带「可看图」的模型') }}
      </p>
    </form>
  </aside>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { useAIStore } from '../stores/ai'
import { useI18n } from '../utils/i18n'
import { toastInfo, toastError } from '../utils/toast'
import {
  buildAdjustPrompt,
  buildAdjustMessages,
  packAdjustContext,
  callChatAuto,
  parseAIPlan,
  normalizeAdjustPlan,
  adjustPlanIsEmpty,
  describeAdjustPlan,
  splitPrintPatch
} from '../utils/ai'
import { savePrinterProfile } from '../utils/printerProfile'
import { fileToVisionDataUrl, visionCalibrateHint } from '../utils/aiImage'
import {
  AI_MODEL_CATALOG,
  BUILTIN_SUPPORTS_VISION,
  isKnownModel,
  modelSupportsVision,
  modelsForBaseUrl
} from '../utils/aiModels'

const { t } = useI18n()
defineProps({
  embedded: { type: Boolean, default: false }
})
const project = useProjectStore()
const data = useDataStore()
const ai = useAIStore()

const emit = defineEmits(['close', 'open-settings', 'applied'])

const instruction = ref('')
const plan = ref(null)
const chat = ref([])
const chatEl = ref(null)
const warnings = ref([])
const loading = ref(false)
const error = ref('')

const imageInput = ref(null)
const attachDataUrl = ref('')
const attachPreview = computed(() => attachDataUrl.value || '')
const dragOver = ref(false)
let dragDepth = 0

const providerModels = computed(() => modelsForBaseUrl(ai.baseUrl))

const dialogModelValue = computed(() => {
  const id = ai.model
  if (providerModels.value.some((m) => m.id === id)) return id
  return id || providerModels.value[0]?.id || AI_MODEL_CATALOG[0]?.id || ''
})

const unknownDialogModel = computed(() => {
  const id = ai.model
  if (!id) return ''
  if (providerModels.value.some((m) => m.id === id)) return ''
  return id
})

const isBuiltin = computed(() => ai.isBuiltin())
// 内置默认走纯文本模型；网关换成视觉模型后服务端会传回来，这里暂按不能看图处理
const currentModelVision = computed(() => (isBuiltin.value ? !!BUILTIN_SUPPORTS_VISION : modelSupportsVision(ai.model)))

const dataFields = computed(() => data.fields.filter((h) => h && h !== '__id'))

function shortModelLabel(m) {
  if (!m) return ''
  const raw = String(m.label || m.id)
  return raw.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim() || m.id
}

function onDialogModelChange(e) {
  const id = e?.target?.value
  if (!id) return
  if (providerModels.value.length && !providerModels.value.some((m) => m.id === id) && isKnownModel(id)) {
    return
  }
  ai.setModel(id)
}

const talkHints = [
  { label: '这个放大', text: '把选中的组件放大，字也加大' },
  { label: '空了不印', text: '内容为空的组件不打印' },
  { label: '换成条码', text: '把选中的二维码改成条形码，绑定的内容保持不变' },
  { label: '价格标红', text: '价格改成红色大字' },
  { label: '热敏纠偏', text: '热敏整张偏右约 2mm、略偏大，请在现有校准上把水平偏移减 2、缩放调到 98' },
  { label: '看图纠偏', text: '根据附图估计热敏偏移与缩放，使内容对齐纸边' },
  { label: '重做布局', text: '按现有数据字段重新排一版标签布局，可增删组件，保持纸张与标签尺寸不变' }
]

function clearAttach() {
  attachDataUrl.value = ''
  if (imageInput.value) imageInput.value.value = ''
}

async function attachFile(file) {
  if (!file) return
  try {
    attachDataUrl.value = await fileToVisionDataUrl(file)
    if (isBuiltin.value) {
      toastInfo(t('内置 AI 看不了图。要「看图纠偏」请到设置里切成自定义，并选带「可看图」的模型'), 4200)
    } else if (!currentModelVision.value) {
      toastInfo(t('已附图。当前模型不能看图，请换成带「可看图」的模型'), 4200)
    }
  } catch (err) {
    clearAttach()
    toastError(err?.message || t('图片无法使用'))
  }
}

async function onPickImage(e) {
  await attachFile(e?.target?.files?.[0])
}

function clipboardImageFile(e) {
  const items = e?.clipboardData?.items
  if (!items) return null
  for (const item of items) {
    if (item.kind === 'file' && String(item.type || '').startsWith('image/')) {
      return item.getAsFile()
    }
  }
  const files = e?.clipboardData?.files
  if (files?.length) {
    for (const f of files) {
      if (String(f.type || '').startsWith('image/')) return f
    }
  }
  return null
}

async function onPaste(e) {
  const file = clipboardImageFile(e)
  if (!file) return
  e.preventDefault()
  await attachFile(file)
}

function onDragEnter(e) {
  if (![...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files')) return
  dragDepth += 1
  dragOver.value = true
}

function onDragOver(e) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  dragOver.value = true
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragOver.value = false
}

async function onDropFiles(e) {
  dragDepth = 0
  dragOver.value = false
  const file = [...(e.dataTransfer?.files || [])].find((f) => String(f.type || '').startsWith('image/'))
  if (!file) {
    toastError(t('请拖入图片文件'))
    return
  }
  await attachFile(file)
}

const planLines = computed(() => describeAdjustPlan(plan.value))
const canApplyPlan = computed(() => plan.value && !adjustPlanIsEmpty(plan.value))
const adjustReads = computed(() => {
  const p = project.project
  const L = p.layout || {}
  const sheet = L.mode === 'auto'
    ? t('{c} 列 × {r} 行', { c: L.cols || 1, r: L.rows || 1 })
    : t('单张')
  const sel = project.selectedIds
    .map((id) => p.components.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => c.name || c.type)
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
  return !!(d.addColumns?.length || d.renameColumns?.length || d.removeColumns?.length || d.addRows?.length || d.setColumn?.length || d.setCells?.length || d.removeRows?.length)
}

async function onAdjust() {
  if (!ai.isConfigured()) {
    error.value = t('请先在设置里配置 API Key / 模型')
    return
  }
  const said = instruction.value.trim()
  const imageDataUrl = attachDataUrl.value
  if (!said && !imageDataUrl) {
    error.value = t('先写要改什么，或附上实打照片')
    return
  }
  if (imageDataUrl && isBuiltin.value) {
    error.value = t('内置 AI 看不了图。请到设置里切成自定义，并选带「可看图」的模型')
    return
  }
  loading.value = true
  error.value = ''
  try {
    const packed = packAdjustContext({
      project: project.project,
      rows: data.rows,
      fields: dataFields.value,
      selectedIds: project.selectedIds
    })
    const sys = buildAdjustPrompt(packed)
    const defaultVision = t('根据附图估计热敏偏移与缩放，使内容对齐纸边')
    let userText = said || (imageDataUrl ? defaultVision : '')
    if (imageDataUrl && !currentModelVision.value) {
      error.value = t('已附图。当前模型不能看图，请换成带「可看图」的模型')
      return
    }
    if (imageDataUrl) userText += '\n\n' + visionCalibrateHint(project.project.label)
    const { content } = await callChatAuto({
      source: ai.source,
      builtinEndpoint: ai.builtinEndpoint,
      baseUrl: ai.baseUrl,
      apiKey: ai.apiKey,
      model: ai.model,
      temperature: Math.min(ai.temperature ?? 0.4, 0.3),
      maxTokens: ai.maxTokens
    }, buildAdjustMessages(sys, chat.value, userText, { imageDataUrl }))
    const raw = parseAIPlan(content)
    const { plan: next, warnings: ws } = normalizeAdjustPlan(raw, {
      labelWidth: project.project.label.width,
      labelHeight: project.project.label.height,
      fields: dataFields.value,
      components: project.project.components,
      rowCount: data.rows.length,
      selectedIds: project.selectedIds
    })
    chat.value.push({
      role: 'user',
      text: said || defaultVision,
      image: imageDataUrl || ''
    })
    instruction.value = ''
    clearAttach()
    plan.value = next
    warnings.value = ws
    if (adjustPlanIsEmpty(next)) {
      chat.value.push({ role: 'ai', text: ws.filter(Boolean).join('\n') || t('没有可应用的改动') })
    } else {
      chat.value.push({ role: 'ai', text: next.summary || describeAdjustPlan(next).join('；') })
      if (!planTouchesData(next)) {
        applyPlan({ quiet: true })
        chat.value.push({ role: 'ai', text: t('已改到画布上，旁边就能看到。布局、打印设置和本机热敏校准可以用 Ctrl+Z 撤回。') })
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
  // 先加行，setCells 的行号才能写到新行上
  for (const row of ops.addRows || []) {
    try { data.addRow(row) } catch (e) { notes.push(e.message) }
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
  // 删行放最后（行号按删除前算），从大到小删避免位移
  for (const r of [...(ops.removeRows || [])].sort((a, b) => b - a)) {
    const row = data.rows[r - 1]
    if (row) data.removeRow(row.__id)
  }
  return notes
}

function applyPlan(opts = {}) {
  const next = plan.value
  if (!next || adjustPlanIsEmpty(next)) return
  if (planTouchesData(next) && !opts.quiet) {
    const ask = describeAdjustPlan(next).join('\n') + '\n\n' + t('数据改动不能用 Ctrl+Z 撤回。布局、打印设置和本机热敏校准可以。')
    if (!confirm(ask)) return
  }
  const notes = applyDataOps(next.data || {})
  project.batchUpdate(() => {
    for (const id of next.componentRemoves) project.removeComponent(id)
    for (const item of next.componentUpdates) {
      if (project.project.components.some((c) => c.id === item.id)) project.updateComponent(item.id, item.patch)
    }
    for (const c of next.componentAdds) project.addComponent(c)
    if (next.sheet?.paper) project.updatePaper(next.sheet.paper)
    if (next.sheet?.margin) project.updateMargin(next.sheet.margin)
    if (next.sheet?.label) project.updateLabel(next.sheet.label)
    if (next.sheet?.layout) project.updateLayout(next.sheet.layout)
    if (next.print) {
      const { printConfig, calibrate } = splitPrintPatch(next.print)
      if (printConfig) Object.assign(project.project.printConfig, printConfig)
      if (calibrate) savePrinterProfile(calibrate)
    }
    if (next.order?.length) {
      const moving = new Set(next.order)
      const stay = project.project.components.filter((c) => !moving.has(c.id))
      const raised = next.order.map((id) => project.project.components.find((c) => c.id === id)).filter(Boolean)
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
.icon-btn {
  width: 22px;
  height: 22px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--primary); }
.icon-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }

.chat {
  flex: 1;
  overflow: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}
.hint.soft { opacity: 0.85; }
.bubble {
  font-size: 13px;
  line-height: 1.45;
  padding: 6px 8px;
  border-radius: 6px;
  white-space: pre-wrap;
}
.bubble.user {
  align-self: flex-end;
  max-width: 92%;
  background: rgba(37, 99, 235, 0.12);
}
.bubble.ai {
  align-self: flex-start;
  max-width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
}
.bubble-img {
  display: block;
  margin-bottom: 6px;
  max-width: 160px;
  max-height: 100px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
}

.composer {
  flex-shrink: 0;
  padding: 8px 10px 10px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.chip {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 11px;
  line-height: 1.3;
  cursor: pointer;
  color: var(--text);
}
.chip:hover {
  border-color: rgba(37, 99, 235, 0.45);
  color: var(--primary);
}
.chip:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }

.composer-shell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 8px 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.composer-shell:focus-within {
  border-color: rgba(37, 99, 235, 0.55);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.composer-shell.is-drag {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  background: rgba(37, 99, 235, 0.06);
}
.shell-ta {
  border: 0;
  background: transparent;
  padding: 2px 4px;
  min-height: 64px;
  resize: vertical;
  box-shadow: none;
}
.shell-ta:focus,
.shell-ta:focus-visible { outline: none; }
.shell-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--border);
}
.icon-tool {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.icon-tool:hover { background: var(--bg-hover); color: var(--primary); }
.icon-tool:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.icon-tool:disabled { opacity: 0.4; cursor: not-allowed; }
.model-pick { flex: 1; min-width: 0; }
.model-select {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 6px;
  font: inherit;
  font-size: 11px;
  background: var(--bg-panel);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.model-select:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.send { flex-shrink: 0; }

.attach-chip {
  position: relative;
  align-self: flex-start;
  width: 72px;
  height: 54px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #fff;
}
.attach-chip img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.attach-x {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.attach-x:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }

.vision-warn {
  margin: 0;
  font-size: 11px;
  color: var(--warning, #b45309);
  line-height: 1.4;
}
.warn { color: #b45309; font-size: 12px; }
.error {
  color: #dc2626;
  font-size: 13px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
}
.warnings { display: flex; flex-direction: column; gap: 4px; }
.warning {
  font-size: 11px;
  color: #b45309;
  background: rgba(245, 158, 11, 0.08);
  padding: 4px 6px;
  border-radius: 3px;
}
.plan-lines { display: flex; flex-direction: column; gap: 4px; }
.plan-line {
  font-size: 12px;
  background: rgba(37, 99, 235, 0.08);
  padding: 4px 6px;
  border-radius: 3px;
}
.ta {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  font: inherit;
  font-size: 13px;
  line-height: 1.45;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  resize: vertical;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.btn-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (prefers-reduced-motion: reduce) {
  .composer-shell { transition: none; }
}
</style>
