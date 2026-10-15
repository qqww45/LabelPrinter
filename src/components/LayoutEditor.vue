<template>
  <div class="layout-editor-overlay" @click.self="$emit('close')">
    <div class="layout-editor">
      <!-- 顶部工具条 -->
      <div class="editor-header">
        <div class="title">📐 {{ t('排版编辑器') }}</div>
        <div class="modes">
          <div class="seg">
            <button :class="{active: form.layout.mode === 'single'}" @click="form.layout.mode = 'single'">{{ t('单张') }}</button>
            <button :class="{active: form.layout.mode === 'auto'}" @click="form.layout.mode = 'auto'">{{ t('自动排版') }}</button>
          </div>
          <div v-if="form.layout.mode === 'auto'" class="seg">
            <button :class="{active: form.layout.sizingMode === 'auto'}" @click="form.layout.sizingMode = 'auto'" :title="t('按标签尺寸自动算行列')">{{ t('按标签尺寸') }}</button>
            <button :class="{active: form.layout.sizingMode === 'manual'}" @click="form.layout.sizingMode = 'manual'" :title="t('按行列反推标签尺寸')">{{ t('按行列') }}</button>
          </div>
        </div>
        <div class="spacer"></div>
        <button class="btn" @click="$emit('close')">{{ t('取消') }}</button>
        <button class="btn btn-primary" @click="apply">{{ t('应用') }}</button>
      </div>

      <div class="editor-body">
        <!-- 左侧：画布 + 拖动手柄 -->
        <div class="editor-canvas-area">
          <div class="canvas-scroll">
            <div class="canvas-stage" :style="stageStyle">
              <!-- 纸张 -->
              <div class="paper" :style="paperStyle">
                <!-- 边距点线框（视觉标识） -->
                <div class="margin-rect" :style="marginRectStyle"></div>

                <!-- 标签区（用于拖动 margin 的左/上把手） -->
                <div
                  class="handle handle-left"
                  :style="handleStyle('left')"
                  @mousedown.stop="startDrag('left', $event)"
                  :title="t('左间距')"
                ></div>
                <div
                  class="handle handle-right"
                  :style="handleStyle('right')"
                  @mousedown.stop="startDrag('right', $event)"
                  :title="t('右间距')"
                ></div>
                <div
                  class="handle handle-top"
                  :style="handleStyle('top')"
                  @mousedown.stop="startDrag('top', $event)"
                  :title="t('上间距')"
                ></div>
                <div
                  class="handle handle-bottom"
                  :style="handleStyle('bottom')"
                  @mousedown.stop="startDrag('bottom', $event)"
                  :title="t('下间距')"
                ></div>

                <!-- 标签 -->
                <template v-if="form.layout.mode === 'auto'">
                  <div
                    v-for="i in perPage"
                    :key="i"
                    class="label-cell"
                    :style="labelCellStyle(i - 1)"
                  >
                    <div class="label-index">{{ i }}</div>
                    <div
                      v-if="form.layout.sizingMode === 'manual'"
                      class="size-handle size-r"
                      @mousedown.stop="startDragSize('w', $event)"
                      :title="t('拖动改标签宽')"
                    ></div>
                    <div
                      v-if="form.layout.sizingMode === 'manual'"
                      class="size-handle size-b"
                      @mousedown.stop="startDragSize('h', $event)"
                      :title="t('拖动改标签高')"
                    ></div>
                  </div>
                  <!-- 间隙手柄（相对纸张定位） -->
                  <div
                    v-for="i in Math.max(0, perPage - 1)"
                    :key="'gh' + i"
                    v-show="gapHandleStyleH(i - 1).display !== 'none'"
                    class="gap-handle"
                    :style="gapHandleStyleH(i - 1)"
                    @mousedown.stop="startDragGap('h', $event)"
                    :title="t('水平间距')"
                  ></div>
                  <div
                    v-for="i in Math.max(0, perPage - cols)"
                    :key="'gv' + i"
                    v-show="gapHandleStyleV(i - 1).display !== 'none'"
                    class="gap-handle"
                    :style="gapHandleStyleV(i - 1)"
                    @mousedown.stop="startDragGap('v', $event)"
                    :title="t('垂直间距')"
                  ></div>
                </template>
                <template v-else>
                  <div class="label-cell single" :style="singleLabelStyle">
                    <div class="label-info">{{ form.label.width.toFixed(0) }} × {{ form.label.height.toFixed(0) }} mm</div>
                    <div
                      class="size-handle size-r"
                      @mousedown.stop="startDragSize('w', $event)"
                    ></div>
                    <div
                      class="size-handle size-b"
                      @mousedown.stop="startDragSize('h', $event)"
                    ></div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="canvas-hint">
            {{ t('拖动') }} <span class="hl-cyan">{{ t('青色边') }}</span> {{ t('调整纸张边距') }} · {{ t('拖动') }} <span class="hl-amber">{{ t('黄色手柄') }}</span> {{ t('调标签尺寸') }} · {{ t('拖动') }} <span class="hl-purple">{{ t('紫色块') }}</span> {{ t('调间距') }}
          </div>
        </div>

        <!-- 右侧：表单 -->
        <div class="editor-form">
          <fieldset>
            <legend>📦 {{ t('标签尺寸 (mm)') }}</legend>
            <div class="form-row">
              <label>{{ t('预设') }}</label>
              <select class="input" :value="labelPresetName" @change="applyLabelPreset($event)">
                <option value="">-- {{ t('选择') }} --</option>
                <option v-for="p in labelPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ t('宽') }}</label>
              <input class="input" type="number" step="0.1" :value="form.label.width" @input="form.label.width = +$event.target.value" />
              <label>{{ t('高') }}</label>
              <input class="input" type="number" step="0.1" :value="form.label.height" @input="form.label.height = +$event.target.value" />
            </div>
            <div class="form-row">
              <label>{{ t('背景') }}</label>
              <input class="input" type="color" :value="form.label.backgroundColor || '#ffffff'" @input="form.label.backgroundColor = $event.target.value" />
            </div>
            <div class="form-row">
              <label>{{ t('边框') }}</label>
              <div class="seg">
                <button :class="{active: !form.label.showBorder}" @click="form.label.showBorder = false">{{ t('无边框') }}</button>
                <button :class="{active: form.label.showBorder}" @click="form.label.showBorder = true">{{ t('显示') }}</button>
              </div>
            </div>
            <div v-if="form.label.showBorder" class="form-row">
              <label>{{ t('颜色') }}</label>
              <input class="input" type="color" :value="form.label.borderColor || '#000000'" @input="form.label.borderColor = $event.target.value" />
              <label>{{ t('粗细') }}</label>
              <input class="input" type="number" step="0.1" min="0.1" :value="form.label.borderWidth ?? 0.3" @input="form.label.borderWidth = +$event.target.value" />
            </div>
          </fieldset>

          <fieldset>
            <legend>📄 {{ t('纸张尺寸 (mm)') }}</legend>
            <div class="form-row">
              <label>{{ t('预设') }}</label>
              <select class="input" :value="paperPresetName" @change="applyPaperPreset($event)">
                <option value="">-- {{ t('选择') }} --</option>
                <option v-for="p in paperPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ t('宽') }}</label>
              <input class="input" type="number" :value="form.paper.width" @input="form.paper.width = +$event.target.value" />
              <label>{{ t('高') }}</label>
              <input class="input" type="number" :value="form.paper.height" @input="form.paper.height = +$event.target.value" />
            </div>
            <div class="form-row">
              <label>{{ t('背景') }}</label>
              <input class="input" type="color" :value="form.paper.backgroundColor" @input="form.paper.backgroundColor = $event.target.value" />
            </div>
          </fieldset>

          <fieldset>
            <legend>📏 {{ t('纸张边距 (mm)') }}</legend>
            <div class="form-row">
              <label>{{ t('上') }}</label><input class="input" type="number" :value="form.margin.top" @input="form.margin.top = +$event.target.value" />
              <label>{{ t('下') }}</label><input class="input" type="number" :value="form.margin.bottom" @input="form.margin.bottom = +$event.target.value" />
            </div>
            <div class="form-row">
              <label>{{ t('左') }}</label><input class="input" type="number" :value="form.margin.left" @input="form.margin.left = +$event.target.value" />
              <label>{{ t('右') }}</label><input class="input" type="number" :value="form.margin.right" @input="form.margin.right = +$event.target.value" />
            </div>
          </fieldset>

          <fieldset v-if="form.layout.mode === 'auto'">
            <legend>↔ {{ t('标签间距 (mm)') }}</legend>
            <div class="form-row">
              <label>{{ t('水平') }}</label><input class="input" type="number" step="0.1" :value="form.layout.hGap" @input="form.layout.hGap = +$event.target.value" />
              <label>{{ t('垂直') }}</label><input class="input" type="number" step="0.1" :value="form.layout.vGap" @input="form.layout.vGap = +$event.target.value" />
            </div>
            <div v-if="form.layout.sizingMode === 'manual'" class="form-row">
              <label>{{ t('每行') }}</label><input class="input" type="number" min="1" :value="form.layout.cols" @input="form.layout.cols = +$event.target.value" />
              <label>{{ t('每列') }}</label><input class="input" type="number" min="1" :value="form.layout.rows" @input="form.layout.rows = +$event.target.value" />
            </div>
            <div class="hint">
              <b>{{ cols }} × {{ rows }} = {{ perPage }} {{ t('个/页') }}</b>
              <span v-if="form.layout.sizingMode === 'auto'">（{{ t('按标签尺寸自动算）') }}</span>
              <span v-else>（{{ t('按行列）') }}</span>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onBeforeUnmount } from 'vue'
import { useProjectStore, PAPER_PRESETS, LABEL_PRESETS } from '../stores/project'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()

const project = useProjectStore()
const paperPresets = PAPER_PRESETS
const labelPresets = LABEL_PRESETS
const emit = defineEmits(['close'])

const form = reactive(JSON.parse(JSON.stringify(project.project)))

// 预设回显：当前宽高与预设精确匹配时选中（容差 0.01mm），手动改宽高自动回落
function matchPreset(list, w, h) {
  return (list.find(p => Math.abs(p.width - w) < 0.01 && Math.abs(p.height - h) < 0.01) || {}).name || ''
}
const labelPresetName = computed(() => matchPreset(labelPresets, form.label.width, form.label.height))
const paperPresetName = computed(() => matchPreset(paperPresets, form.paper.width, form.paper.height))

// 画布显示缩放：根据纸张大小自适应
const stageScale = computed(() => {
  const maxW = 720
  const maxH = 540
  const sx = maxW / form.paper.width
  const sy = maxH / form.paper.height
  return Math.min(sx, sy, 4) // 最多放大 4 倍
})

const stageStyle = computed(() => ({
  width: (form.paper.width * stageScale.value) + 'px',
  height: (form.paper.height * stageScale.value) + 'px'
}))

const paperStyle = computed(() => ({
  width: '100%', height: '100%',
  background: form.paper.backgroundColor || '#fff',
  position: 'absolute', top: 0, left: 0
}))

const marginRectStyle = computed(() => ({
  position: 'absolute',
  left: (form.margin.left * stageScale.value) + 'px',
  top: (form.margin.top * stageScale.value) + 'px',
  right: (form.margin.right * stageScale.value) + 'px',
  bottom: (form.margin.bottom * stageScale.value) + 'px',
  border: '1px dashed var(--layout-margin-rect, #cbd5e1)',
  pointerEvents: 'none'
}))

// 排版几何
const cols = computed(() => {
  if (form.layout.mode !== 'auto') return 1
  if (form.layout.sizingMode === 'manual') return Math.max(1, form.layout.cols || 1)
  const aw = form.paper.width - form.margin.left - form.margin.right
  return Math.max(1, Math.floor((aw + (form.layout.hGap || 0)) / (Math.max(1, form.label.width) + (form.layout.hGap || 0))))
})
const rows = computed(() => {
  if (form.layout.mode !== 'auto') return 1
  if (form.layout.sizingMode === 'manual') return Math.max(1, form.layout.rows || 1)
  const ah = form.paper.height - form.margin.top - form.margin.bottom
  return Math.max(1, Math.floor((ah + (form.layout.vGap || 0)) / (Math.max(1, form.label.height) + (form.layout.vGap || 0))))
})
const perPage = computed(() => cols.value * rows.value)

function labelCellStyle(idx) {
  const ox = form.margin.left
  const oy = form.margin.top
  const c = idx % cols.value
  const r = Math.floor(idx / cols.value)
  return {
    position: 'absolute',
    left: ((ox + c * (form.label.width + (form.layout.hGap || 0))) * stageScale.value) + 'px',
    top: ((oy + r * (form.label.height + (form.layout.vGap || 0))) * stageScale.value) + 'px',
    width: (form.label.width * stageScale.value) + 'px',
    height: (form.label.height * stageScale.value) + 'px',
    background: 'var(--layout-label-bg, rgba(99,102,241,0.06))',
    border: '1px solid var(--layout-label-border, #6366f1)',
    boxSizing: 'border-box'
  }
}

const singleLabelStyle = computed(() => ({
  position: 'absolute',
  left: (form.margin.left * stageScale.value) + 'px',
  top: (form.margin.top * stageScale.value) + 'px',
  width: (form.label.width * stageScale.value) + 'px',
  height: (form.label.height * stageScale.value) + 'px',
  background: 'var(--layout-label-bg, rgba(99,102,241,0.06))',
  border: '1px solid var(--layout-label-border, #6366f1)',
  boxSizing: 'border-box'
}))

function handleStyle(side) {
  const s = stageScale.value
  const t = 6 // 手柄厚度 px
  const bg = 'var(--layout-handle-cyan, #06b6d4)'
  if (side === 'left') return {
    position: 'absolute',
    left: (form.margin.left * s - t / 2) + 'px', top: (form.margin.top * s) + 'px',
    width: t + 'px',
    height: ((form.paper.height - form.margin.top - form.margin.bottom) * s) + 'px',
    cursor: 'ew-resize',
    background: bg, opacity: 0.7, zIndex: 10
  }
  if (side === 'right') return {
    position: 'absolute',
    right: (form.margin.right * s - t / 2) + 'px', top: (form.margin.top * s) + 'px',
    width: t + 'px',
    height: ((form.paper.height - form.margin.top - form.margin.bottom) * s) + 'px',
    cursor: 'ew-resize',
    background: bg, opacity: 0.7, zIndex: 10
  }
  if (side === 'top') return {
    position: 'absolute',
    top: (form.margin.top * s - t / 2) + 'px', left: (form.margin.left * s) + 'px',
    height: t + 'px',
    width: ((form.paper.width - form.margin.left - form.margin.right) * s) + 'px',
    cursor: 'ns-resize',
    background: bg, opacity: 0.7, zIndex: 10
  }
  if (side === 'bottom') return {
    position: 'absolute',
    bottom: (form.margin.bottom * s - t / 2) + 'px', left: (form.margin.left * s) + 'px',
    height: t + 'px',
    width: ((form.paper.width - form.margin.left - form.margin.right) * s) + 'px',
    cursor: 'ns-resize',
    background: bg, opacity: 0.7, zIndex: 10
  }
}

function gapHandleStyleH(idx) {
  // 水平间隙手柄：在第 idx 个标签右边
  const c = idx % cols.value
  const r = Math.floor(idx / cols.value)
  if (c >= cols.value - 1) return { display: 'none' }
  const s = stageScale.value
  const lw = form.label.width * s
  const ox = form.margin.left * s
  const oy = form.margin.top * s
  const lh = form.label.height * s
  return {
    position: 'absolute',
    left: (ox + c * (lw + (form.layout.hGap || 0) * s) + lw - 4) + 'px',
    top: (oy + r * (lh + (form.layout.vGap || 0) * s) + lh / 2 - 6) + 'px',
    width: '8px', height: '12px',
    background: 'var(--layout-handle-purple, #a855f7)', borderRadius: '2px', cursor: 'ew-resize', zIndex: 11
  }
}
function gapHandleStyleV(idx) {
  if (idx < cols.value) return { display: 'none' }
  const c = idx % cols.value
  const r = Math.floor(idx / cols.value)
  const s = stageScale.value
  const lw = form.label.width * s
  const lh = form.label.height * s
  const ox = form.margin.left * s
  const oy = form.margin.top * s
  return {
    position: 'absolute',
    left: (ox + c * (lw + (form.layout.hGap || 0) * s) + lw / 2 - 6) + 'px',
    top: (oy + r * (lh + (form.layout.vGap || 0) * s) + lh - 4) + 'px',
    width: '12px', height: '8px',
    background: 'var(--layout-handle-purple, #a855f7)', borderRadius: '2px', cursor: 'ns-resize', zIndex: 11
  }
}

// ============ 拖动逻辑 ============
const dragInfo = ref(null)

function startDrag(side, e) {
  const startX = e.clientX
  const startY = e.clientY
  const startMargin = { ...form.margin }
  dragInfo.value = { kind: 'margin', side, startX, startY, startMargin }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  e.preventDefault()
}

function startDragSize(dim, e) {
  const startX = e.clientX
  const startY = e.clientY
  const startLabel = { ...form.label }
  dragInfo.value = { kind: 'size', dim, startX, startY, startLabel }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  e.preventDefault()
}

function startDragGap(dir, e) {
  const startX = e.clientX
  const startY = e.clientY
  const startLayout = { hGap: form.layout.hGap, vGap: form.layout.vGap }
  dragInfo.value = { kind: 'gap', dir, startX, startY, startLayout }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  e.preventDefault()
}

function onMouseMove(e) {
  if (!dragInfo.value) return
  const dx = (e.clientX - dragInfo.value.startX) / stageScale.value
  const dy = (e.clientY - dragInfo.value.startY) / stageScale.value
  if (dragInfo.value.kind === 'margin') {
    const s = dragInfo.value.side
    const m = dragInfo.value.startMargin
    if (s === 'left') form.margin.left = Math.max(0, Math.min(form.paper.width - form.margin.right - 1, m.left + dx))
    else if (s === 'right') form.margin.right = Math.max(0, Math.min(form.paper.width - form.margin.left - 1, m.right - dx))
    else if (s === 'top') form.margin.top = Math.max(0, Math.min(form.paper.height - form.margin.bottom - 1, m.top + dy))
    else if (s === 'bottom') form.margin.bottom = Math.max(0, Math.min(form.paper.height - form.margin.top - 1, m.bottom - dy))
  } else if (dragInfo.value.kind === 'size') {
    const l = dragInfo.value.startLabel
    if (dragInfo.value.dim === 'w') {
      form.label.width = Math.max(5, l.width + dx)
    } else {
      form.label.height = Math.max(5, l.height + dy)
    }
    // 切到 manual 模式让用户改尺寸不被自动重算覆盖
    if (form.layout.mode === 'auto') form.layout.sizingMode = 'manual'
  } else if (dragInfo.value.kind === 'gap') {
    const L = dragInfo.value.startLayout
    if (dragInfo.value.dir === 'h') form.layout.hGap = Math.max(0, L.hGap + dx)
    else form.layout.vGap = Math.max(0, L.vGap + dy)
  }
}

function onMouseUp() {
  dragInfo.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

// ============ 应用 ============
function applyPaperPreset(e) {
  const p = paperPresets.find(p => p.name === e.target.value)
  if (!p) return
  form.paper.width = p.width
  form.paper.height = p.height
}
function applyLabelPreset(e) {
  const p = labelPresets.find(p => p.name === e.target.value)
  if (!p) return
  form.label.width = p.width
  form.label.height = p.height
}

function apply() {
  project.updatePaper({ ...form.paper })
  project.updateMargin({ ...form.margin })
  project.updateLabel({ ...form.label })
  const l = { ...form.layout }
  if (l.sizingMode === 'auto') {
    delete l.cols
    delete l.rows
  }
  project.updateLayout(l)
  emit('close')
}
</script>

<style scoped>
.layout-editor-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.layout-editor {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 96vw; height: 92vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  color: var(--text);
}
.editor-header {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
}
.title { font-weight: 600; font-size: 14px; }
.modes { display: flex; gap: 8px; }
.seg { display: flex; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.seg button {
  padding: 4px 10px; font-size: 12px;
  background: var(--bg-panel); color: var(--text);
  border: 0; cursor: pointer;
  border-right: 1px solid var(--border);
}
.seg button:last-child { border-right: 0; }
.seg button.active { background: var(--primary); color: white; }
.spacer { flex: 1; }
.editor-body { flex: 1; display: flex; overflow: hidden; }
.editor-canvas-area {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; position: relative;
}
.canvas-scroll {
  flex: 1; overflow: auto;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  /* 棋盘格用主题感知：亮色=浅灰格，暗色=深灰格 */
  --checker: var(--border);
  background:
    linear-gradient(45deg, var(--checker) 25%, transparent 25%),
    linear-gradient(-45deg, var(--checker) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--checker) 75%),
    linear-gradient(-45deg, transparent 75%, var(--checker) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-color: var(--bg);
}
.canvas-stage {
  position: relative;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}
.paper { position: absolute; }
.label-cell { display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6366f1; }
[data-theme='dark'] .label-cell { color: #a5b4fc; }
.label-cell.single { }
.label-index { pointer-events: none; opacity: 0.5; }
.label-info { pointer-events: none; opacity: 0.7; font-size: 11px; }
.handle { transition: opacity 0.2s; }
.handle:hover { opacity: 1 !important; }
.gap-handle { transition: transform 0.1s; }
.gap-handle:hover { transform: scale(1.4); }
.size-handle {
  position: absolute; right: 0; bottom: 0;
  width: 10px; height: 10px;
  background: #f59e0b; cursor: nwse-resize;
  /* 白边在亮色下清晰、暗色下过亮 → 跟随面板背景 */
  border: 1px solid var(--bg-panel);
}
.size-r { cursor: ew-resize; right: 0; left: auto; width: 6px; height: 30%; top: 35%; }
.size-b { cursor: ns-resize; bottom: 0; top: auto; height: 6px; width: 30%; left: 35%; }
.size-handle:hover { background: #fbbf24; }
.canvas-hint {
  padding: 6px 12px; background: var(--bg-panel);
  font-size: 12px; color: var(--text-secondary);
  border-top: 1px solid var(--border);
}
.hl-cyan { color: #06b6d4; font-weight: 600; }
.hl-amber { color: #f59e0b; font-weight: 600; }
.hl-purple { color: #a855f7; font-weight: 600; }

.editor-form {
  width: 280px; flex-shrink: 0;
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  padding: 12px;
  overflow: auto;
}
fieldset { border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 10px; margin-bottom: 10px; min-width: 0; }
legend { padding: 0 6px; font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.form-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.form-row label { font-size: 12px; min-width: 32px; color: var(--text-secondary); }
.input {
  padding: 3px 6px; font-size: 12px;
  border: 1px solid var(--border); border-radius: 3px;
  background: var(--bg-panel); color: var(--text);
}
.hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

/* 暗色模式：遮罩加深，让弹窗在暗背景上更聚焦 */
[data-theme='dark'] .layout-editor-overlay { background: rgba(0, 0, 0, 0.75); }
/* 暗色下虚线/标签/手柄要更亮才看得见（变量在 main.css 全局定义） */
</style>
