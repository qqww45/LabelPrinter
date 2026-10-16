<template>
  <div class="canvas-toolbar" role="toolbar" :aria-label="t('画布工具')">
    <div class="cluster">
      <button class="tool" type="button" :disabled="!project.canUndo" @click="project.undo()" :title="t('撤销 (Ctrl+Z)')" :aria-label="t('撤销 (Ctrl+Z)')">
        <span class="ico" v-html="icons.undo"></span>
      </button>
      <button class="tool" type="button" :disabled="!project.canRedo" @click="project.redo()" :title="t('重做 (Ctrl+Y)')" :aria-label="t('重做 (Ctrl+Y)')">
        <span class="ico" v-html="icons.redo"></span>
      </button>
    </div>

    <span class="rule" aria-hidden="true"></span>

    <div class="cluster zoom-cluster">
      <button class="tool" type="button" @click="zoomOut" :title="t('缩小 (Ctrl+-)')" :aria-label="t('缩小')">
        <span class="ico" v-html="icons.minus"></span>
      </button>
      <label class="zoom-readout" :title="t('缩放比例（点击选常用档位）')">
        <span class="sr-only">{{ t('缩放') }}</span>
        <select :value="zoomPercent" @change="onZoomPreset($event.target.value)">
          <option v-for="p in zoomOptions" :key="p" :value="p">{{ p }}%</option>
        </select>
      </label>
      <button class="tool" type="button" @click="zoomIn" :title="t('放大 (Ctrl++)')" :aria-label="t('放大')">
        <span class="ico" v-html="icons.plus"></span>
      </button>
      <button class="tool" type="button" @click="zoomReset" :title="t('实际大小 (Ctrl+0)')" :aria-label="t('实际大小')">1:1</button>
      <button class="tool" type="button" @click="zoomFit" :title="t('适合窗口 (F)')" :aria-label="t('适合窗口')">
        <span class="ico" v-html="icons.fit"></span>
      </button>
      <button
        class="tool"
        type="button"
        :class="{ on: project.showGrid }"
        @click="toggleGrid"
        :title="t('网格 (G)') + (project.showGrid ? ' · ' + t('已开启') : ' · ' + t('已关闭'))"
        :aria-label="t('网格')"
        :aria-pressed="project.showGrid"
      >
        <span class="ico" v-html="icons.grid"></span>
      </button>
    </div>

    <span class="rule" aria-hidden="true"></span>

    <div class="cluster align-cluster" :class="{ dim: !canAlign }">
      <button class="tool" type="button" :disabled="!canAlign" @click="align('left')" :title="t('左对齐')" :aria-label="t('左对齐')">
        <span class="ico" v-html="icons.alignLeft"></span>
      </button>
      <button class="tool" type="button" :disabled="!canAlign" @click="align('hcenter')" :title="t('水平居中')" :aria-label="t('水平居中')">
        <span class="ico" v-html="icons.alignH"></span>
      </button>
      <button class="tool" type="button" :disabled="!canAlign" @click="align('right')" :title="t('右对齐')" :aria-label="t('右对齐')">
        <span class="ico" v-html="icons.alignRight"></span>
      </button>
      <button class="tool" type="button" :disabled="!canAlign" @click="align('top')" :title="t('上对齐')" :aria-label="t('上对齐')">
        <span class="ico" v-html="icons.alignTop"></span>
      </button>
      <button class="tool" type="button" :disabled="!canAlign" @click="align('vcenter')" :title="t('垂直居中')" :aria-label="t('垂直居中')">
        <span class="ico" v-html="icons.alignV"></span>
      </button>
      <button class="tool" type="button" :disabled="!canAlign" @click="align('bottom')" :title="t('下对齐')" :aria-label="t('下对齐')">
        <span class="ico" v-html="icons.alignBottom"></span>
      </button>
      <button class="tool" type="button" :disabled="!canDistribute" @click="distribute('h')" :title="t('水平等距（需 ≥3 个）')" :aria-label="t('水平等距')">
        <span class="ico" v-html="icons.distH"></span>
      </button>
      <button class="tool" type="button" :disabled="!canDistribute" @click="distribute('v')" :title="t('垂直等距（需 ≥3 个）')" :aria-label="t('垂直等距')">
        <span class="ico" v-html="icons.distV"></span>
      </button>
    </div>

    <div class="spacer"></div>

    <div class="meta" :title="sizeHint">
      <span class="meta-chip">{{ project.project.label.width }}×{{ project.project.label.height }}</span>
      <span class="meta-unit">mm</span>
      <span class="meta-sep" aria-hidden="true">·</span>
      <span class="meta-chip faint">{{ layoutHint }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useProjectStore } from '../stores/project'
import { useI18n } from '../utils/i18n'
import { fitZoomToWindow } from '../utils/canvasFit'

const project = useProjectStore()
const { t } = useI18n()

const S = (d) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const icons = {
  undo: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a5 5 0 0 1 0 10h-3"/>'),
  redo: S('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a5 5 0 0 0 0 10h3"/>'),
  minus: S('<path d="M5 12h14"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  fit: S('<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>'),
  grid: S('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4v16"/>'),
  alignLeft: S('<path d="M4 4v16M8 8h8M8 12h12M8 16h6"/>'),
  alignH: S('<path d="M12 4v16M7 8h10M5 12h14M8 16h8"/>'),
  alignRight: S('<path d="M20 4v16M8 8h8M4 12h12M10 16h6"/>'),
  alignTop: S('<path d="M4 4h16M8 8v8M12 8v12M16 8v6"/>'),
  alignV: S('<path d="M4 12h16M8 7v10M12 5v14M16 8v8"/>'),
  alignBottom: S('<path d="M4 20h16M8 8v8M12 4v12M16 10v6"/>'),
  distH: S('<path d="M4 6v12M20 6v12M9 10h6M9 14h6"/>'),
  distV: S('<path d="M6 4h12M6 20h12M10 9v6M14 9v6"/>')
}

const canAlign = computed(() => project.selectedIds.length >= 2)
const canDistribute = computed(() => project.selectedIds.length >= 3)

const zoomPresets = [25, 50, 75, 100, 125, 150, 200, 300, 400]
const zoomPercent = computed(() => Math.round(project.zoom * 100))
const zoomOptions = computed(() => {
  const current = zoomPercent.value
  if (zoomPresets.includes(current)) return zoomPresets
  return [...zoomPresets, current].sort((a, b) => a - b)
})

const layoutHint = computed(() => {
  const L = project.project.layout || {}
  if (L.mode === 'auto') {
    const n = Math.max(1, (L.cols || 1) * (L.rows || 1))
    return t('{n} 张/页', { n })
  }
  return t('单张')
})
const sizeHint = computed(() =>
  `${t('标签')} ${project.project.label.width}×${project.project.label.height} mm · ${layoutHint.value}`
)

function step() {
  const z = project.zoom
  if (z < 0.5) return 0.1
  if (z < 1.5) return 0.05
  return 0.1
}
function zoomIn() { project.zoom = Math.min(4, +(project.zoom + step()).toFixed(2)); project.autoFit = false }
function zoomOut() { project.zoom = Math.max(0.2, +(project.zoom - step()).toFixed(2)); project.autoFit = false }
function zoomReset() { project.zoom = 1; project.autoFit = false }
function onZoomPreset(p) { project.zoom = Number(p) / 100; project.autoFit = false }
function zoomFit() {
  const wrap = document.querySelector('.design-canvas-wrap')
  const z = fitZoomToWindow(wrap, project.project.label.width || 50, project.project.label.height || 30)
  if (z != null) project.zoom = z
  project.autoFit = true
}
function toggleGrid() { project.showGrid = !project.showGrid }
function align(dir) { project.alignSelected(dir) }
function distribute(axis) { project.distributeSelected(axis) }

function onKeydown(e) {
  const tag = (e.target.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn() }
    else if (e.key === '-') { e.preventDefault(); zoomOut() }
    else if (e.key === '0') { e.preventDefault(); zoomReset() }
    return
  }
  if (e.key.toLowerCase() === 'f') { e.preventDefault(); zoomFit() }
  if (e.key.toLowerCase() === 'g') { e.preventDefault(); toggleGrid() }
}
function onWheel(e) {
  if (!e.ctrlKey && !e.metaKey) return
  if (!e.target.closest('.design-canvas-wrap') && !e.target.closest('.canvas-stage')) return
  e.preventDefault()
  if (e.deltaY < 0) zoomIn(); else zoomOut()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('wheel', onWheel, { passive: false })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('wheel', onWheel)
})
</script>

<style scoped>
.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  min-height: 40px;
  padding: 4px 10px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-panel) 92%, var(--primary) 8%), var(--bg-panel));
  border-bottom: 1px solid var(--border);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--bg) 60%, transparent);
}
.cluster {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--bg-soft, var(--bg));
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}
.cluster.dim { opacity: 0.55; }
.tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 28px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.tool:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}
.tool:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.tool:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.tool.on {
  background: color-mix(in srgb, var(--primary) 18%, transparent);
  color: var(--primary);
}
.ico {
  display: inline-flex;
  width: 15px;
  height: 15px;
  line-height: 0;
}
.ico :deep(svg) { display: block; }
.rule {
  width: 1px;
  height: 20px;
  background: var(--border);
  flex-shrink: 0;
  margin: 0 2px;
}
.zoom-readout {
  display: inline-flex;
  align-items: center;
}
.zoom-readout select {
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  background: transparent;
  color: var(--text);
  font-family: ui-monospace, "Cascadia Mono", "SF Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
  padding: 0 14px 0 6px;
  height: 28px;
  cursor: pointer;
  border-radius: 6px;
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 8px) 12px, calc(100% - 4px) 12px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}
.zoom-readout select:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.spacer { flex: 1; min-width: 8px; }
.meta {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.meta-chip {
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-weight: 600;
  color: var(--text-secondary);
}
.meta-chip.faint { font-weight: 500; color: var(--text-muted); }
.meta-unit { font-size: 10px; text-transform: lowercase; }
.meta-sep { opacity: 0.5; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 900px) {
  .align-cluster { display: none; }
  .meta { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tool { transition: none; }
}
</style>
