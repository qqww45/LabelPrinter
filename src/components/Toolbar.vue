<template>
  <div class="toolbar" :class="{ compact: isCompact }">
    <div class="group group-brand">
      <div class="logo">
        <span class="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M4 9h16" />
            <path d="M8 13v3M10.5 12v4M13 13.5v2.5M15.5 12v4" stroke-linecap="round" />
          </svg>
        </span>
        <span class="logo-text">{{ t('标签打印工具') }}</span>
      </div>
      <span class="filename" v-if="project.project.meta">
        <span class="filename-text">{{ project.project.meta.name }}</span>
        <span v-if="project.dirty" class="dirty">●</span>
      </span>
    </div>

    <div class="divider divider-hide-narrow" />

    <div class="group group-config">
      <button class="btn" @click="$emit('template-library')" :title="t('内置模板与我的模板')">
        <span class="ico" v-html="icons.library"></span><span class="txt">{{ t('模板库') }}</span>
      </button>
      <button class="btn btn-ai" @click="$emit('ai')" :title="t('AI 调整：对着当前标签说话，画布上马上能看到')">
        <span class="ico" v-html="icons.ai"></span><span class="txt">{{ t('AI 调整') }}</span>
      </button>
      <button class="btn" @click="$emit('field-map')" :title="t('模板字段与数据列的对应关系')">
        <span class="ico" v-html="icons.map"></span><span class="txt">{{ t('字段映射') }}</span>
      </button>
      <button class="btn" @click="$emit('paper-config')" :title="t('纸张与标签尺寸')">
        <span class="ico" v-html="icons.paper"></span><span class="txt">{{ t('纸张设置') }}</span>
      </button>
      <button class="btn" @click="$emit('layout-editor')" :title="t('排版与边距')">
        <span class="ico" v-html="icons.layout"></span><span class="txt">{{ t('排版') }}</span>
      </button>
    </div>

    <div class="divider divider-hide-narrow" />

    <div class="group group-ops">
      <button class="btn keep-label" @click="$emit('print-config')" :title="t('打印设置')">
        <span class="ico" v-html="icons.printSetup"></span><span class="txt">{{ t('打印设置') }}</span>
      </button>
      <button class="btn" @click="$emit('print-center')" :title="t('打印队列与历史记录')">
        <span class="ico" v-html="icons.queue"></span><span class="txt">{{ t('打印中心') }}</span>
      </button>
      <button class="btn" @click="$emit('preview')" :title="t('预览')">
        <span class="ico" v-html="icons.preview"></span><span class="txt">{{ t('预览') }}</span>
      </button>
    </div>

    <div class="divider divider-hide-narrow" />

    <div class="group group-output">
      <button class="btn btn-primary keep-label" @click="$emit('print')" :title="t('打印')">
        <span class="ico" v-html="icons.print"></span><span class="txt">{{ t('打印') }}</span>
      </button>
      <button class="btn" @click="$emit('export-pdf')" :title="t('导出 PDF')">
        <span class="ico" v-html="icons.pdf"></span><span class="txt">PDF</span>
      </button>
      <button class="btn" @click="$emit('export-image')" :title="t('导出图片')">
        <span class="ico" v-html="icons.image"></span><span class="txt">{{ t('图片') }}</span>
      </button>
    </div>

    <div class="spacer" />

    <div class="group">
      <button class="btn btn-icon" @click="project.undo()" :disabled="!project.canUndo" :title="t('撤销 (Ctrl+Z)')">↩</button>
      <button class="btn btn-icon" @click="project.redo()" :disabled="!project.canRedo" :title="t('重做 (Ctrl+Y)')">↪</button>
      <span class="divider divider-hide-narrow" />
      <button
        class="btn btn-icon"
        @click="settings.toggleTheme()"
        :title="settings.theme === 'dark' ? t('切换到亮色') : t('切换到暗色')"
      >
        <span class="ico" v-html="settings.theme === 'dark' ? icons.sun : icons.moon"></span>
      </button>
      <button class="btn btn-icon" @click="settings.toggleLang()" :title="settings.lang === 'en' ? t('切换到中文') : t('Switch to English')">
        {{ settings.lang === 'en' ? '中' : 'EN' }}
      </button>
    </div>

    <div class="group zoom-group">
      <button class="btn btn-icon" @click="zoomOut" :title="t('缩小 (Ctrl+-)')" aria-label="缩小">−</button>
      <div class="zoom-select" :title="t('缩放比例（点击选常用档位）')">
        <select :value="zoomPercent" @change="onZoomPreset($event.target.value)">
          <option v-for="p in zoomOptions" :key="p" :value="p">{{ p }}%</option>
        </select>
      </div>
      <button class="btn btn-icon" @click="zoomIn" :title="t('放大 (Ctrl++)')" aria-label="放大">+</button>
      <button class="btn btn-icon" @click="zoomReset" :title="t('实际大小 (Ctrl+0)')" aria-label="实际大小 100%">1:1</button>
      <button class="btn btn-icon" @click="zoomFit" :title="t('适合窗口 (F)')" aria-label="适合窗口">⛶</button>
      <button
        class="btn btn-icon"
        :class="{ active: project.showGrid }"
        @click="toggleGrid"
        :title="t('网格 (G)') + (project.showGrid ? '  · ' + t('已开启') : '  · ' + t('已关闭'))"
        aria-label="网格"
      >▦</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, ref } from 'vue'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../utils/i18n'
import { fitZoomToWindow } from '../utils/canvasFit'

const project = useProjectStore()
const settings = useSettingsStore()
const { t } = useI18n()

defineEmits(['import-data',
  'paper-config', 'print-config', 'layout-editor', 'preview', 'print', 'export-pdf', 'export-image',
  'template-library', 'field-map', 'print-center', 'ai'])

const S = (d) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const icons = {
  library: S('<path d="M4 5h5v14H4zM10 5h5v14h-5zM16 7h4v12h-4z"/><path d="M6.5 8h1M6.5 11h1M12.5 8h1M12.5 11h1"/>'),
  ai: S('<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4.5"/><path d="M9.5 12h5"/>'),
  map: S('<path d="M4 7h7l2 3h7"/><path d="M7 17h10"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>'),
  paper: S('<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  layout: S('<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 9h17M10 9v11"/>'),
  printSetup: S('<path d="M7 9V4.5h10V9"/><rect x="5" y="9" width="14" height="8" rx="1.5"/><path d="M8 17v2.5h8V17M8 12h3"/>'),
  queue: S('<path d="M5 6h10v12H5z"/><path d="M9 6V4.5h10V16.5H15"/><path d="M7.5 10h5M7.5 13h5"/>'),
  preview: S('<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  print: S('<path d="M7 9V4.5h10V9"/><rect x="5" y="9" width="14" height="8" rx="1.5"/><path d="M8 17v2.5h8V17"/>'),
  pdf: S('<path d="M8 3.5h6l4 4V20.5H8z"/><path d="M14 3.5V8h4"/><path d="M10 13h4M10 16h6"/>'),
  image: S('<rect x="4" y="5" width="16" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 16.5l4.5-4.5 3 3 3-4 4.5 5.5"/>'),
  sun: S('<circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>'),
  moon: S('<path d="M16.5 14.2A6.2 6.2 0 0 1 9.8 7.5 6.5 6.5 0 1 0 16.5 14.2z"/>')
}

const COMPACT_THRESHOLD = 1180
const isCompact = ref(typeof window !== 'undefined' && window.innerWidth < COMPACT_THRESHOLD)
function onResize() { isCompact.value = window.innerWidth < COMPACT_THRESHOLD }

const zoomPresets = [25, 50, 75, 100, 125, 150, 200, 300, 400]
const zoomPercent = computed(() => Math.round(project.zoom * 100))
const zoomOptions = computed(() => {
  const current = zoomPercent.value
  if (zoomPresets.includes(current)) return zoomPresets
  return [...zoomPresets, current].sort((a, b) => a - b)
})

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

function onKeydown(e) {
  const tag = (e.target.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return
  if (!(e.ctrlKey || e.metaKey) && !['+', '-', '0', 'f', 'g'].includes(e.key.toLowerCase())) return
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn() }
    else if (e.key === '-') { e.preventDefault(); zoomOut() }
    else if (e.key === '0') { e.preventDefault(); zoomReset() }
  } else {
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); zoomFit() }
    if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleGrid() }
  }
}
function onWheel(e) {
  if (!e.ctrlKey && !e.metaKey) return
  const canvas = e.target.closest('.design-canvas-wrap')
  if (!canvas) return
  e.preventDefault()
  if (e.deltaY < 0) zoomIn(); else zoomOut()
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border);
  gap: 4px;
  flex-shrink: 0;
  min-height: 48px;
  flex-wrap: wrap;
  row-gap: 4px;
}
.group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.group-config,
.group-ops { background: var(--bg-soft); padding: 2px 6px; border-radius: 6px; }
.group-output { background: rgba(16, 185, 129, 0.08); padding: 2px 6px; border-radius: 6px; }

.btn-ai {
  color: var(--primary) !important;
  border-color: rgba(37, 99, 235, 0.45) !important;
  background: rgba(37, 99, 235, 0.08) !important;
}
.btn-ai:hover {
  background: rgba(37, 99, 235, 0.14) !important;
  border-color: var(--primary) !important;
}

.logo {
  font-weight: 600;
  margin-right: 8px;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary);
}
.logo-text { white-space: nowrap; }
.filename {
  color: var(--text-secondary);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.filename-text {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dirty { color: var(--warning); }
.spacer { flex: 1; }

.btn { display: inline-flex; align-items: center; gap: 5px; }
.btn .ico {
  display: inline-flex;
  width: 15px;
  height: 15px;
  align-items: center;
  justify-content: center;
  line-height: 0;
  opacity: 0.92;
}
.btn .ico :deep(svg) { display: block; }
.btn .txt { white-space: nowrap; }

.zoom-group { gap: 2px; }
.zoom-select {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.zoom-select select {
  appearance: none; -webkit-appearance: none;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 18px 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  height: 28px;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 10px) 12px, calc(100% - 6px) 12px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
  opacity: 0.85;
}
.zoom-select select:hover { opacity: 1; }
.zoom-select select:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
.btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.toolbar.compact .logo-text,
.toolbar.compact .filename-text { display: none; }
.toolbar.compact .btn .txt { display: none; }
.toolbar.compact .btn.keep-label .txt { display: inline; }
.toolbar.compact .divider-hide-narrow { display: none; }
.toolbar.compact .group { background: transparent; padding: 0; }
.toolbar.compact .btn { padding: 4px 6px; }

@media (max-width: 720px) {
  .toolbar.compact .zoom-select { display: none; }
}
</style>
