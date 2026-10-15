<template>
  <div class="toolbar" :class="{ compact: isCompact }">
    <div class="group group-brand">
      <div class="logo">🏷️ <span class="logo-text">{{ t('标签打印工具') }}</span></div>
      <span class="filename" v-if="project.project.meta">
        <span class="filename-text">{{ project.project.meta.name }}</span>
        <span v-if="project.dirty" class="dirty">●</span>
      </span>
    </div>

    <div class="divider divider-hide-narrow" />

    <!-- 配置：数据/模板/页面/排版（5 个） -->
    <div class="group group-config">
      <button class="btn" @click="$emit('template-library')" :title="t('内置模板与我的模板')"><span class="ico">📚</span><span class="txt">{{ t('模板库') }}</span></button>
      <button class="btn btn-ai" @click="$emit('ai')" :title="t('AI 调整：对着当前标签说话，画布上马上能看到')"><span class="ico">🤖</span><span class="txt">{{ t('AI 调整') }}</span></button>
      <button class="btn" @click="$emit('field-map')" :title="t('模板字段与数据列的对应关系')"><span class="ico">🔀</span><span class="txt">{{ t('字段映射') }}</span></button>
      <button class="btn" @click="$emit('paper-config')" :title="t('纸张与标签尺寸')"><span class="ico">⚙</span><span class="txt">{{ t('纸张设置') }}</span></button>
      <button class="btn" @click="$emit('layout-editor')" :title="t('排版与边距')"><span class="ico">📐</span><span class="txt">{{ t('排版') }}</span></button>
    </div>

    <div class="divider divider-hide-narrow" />

    <!-- 打印：设置/队列/预览（3 个） -->
    <div class="group group-ops">
      <button class="btn keep-label" @click="$emit('print-config')" :title="t('打印设置')"><span class="ico">🖨️</span><span class="txt">{{ t('打印设置') }}</span></button>
      <button class="btn" @click="$emit('print-center')" :title="t('打印队列与历史记录')"><span class="ico">🗂</span><span class="txt">{{ t('打印中心') }}</span></button>
      <button class="btn" @click="$emit('preview')" :title="t('预览')"><span class="ico">👁️</span><span class="txt">{{ t('预览') }}</span></button>
    </div>

    <div class="divider divider-hide-narrow" />

    <!-- 输出：执行（3 个） -->
    <div class="group group-output">
      <button class="btn btn-primary keep-label" @click="$emit('print')" :title="t('打印')"><span class="ico">🖨️</span><span class="txt">{{ t('打印') }}</span></button>
      <button class="btn" @click="$emit('export-pdf')" :title="t('导出 PDF')"><span class="ico">📄</span><span class="txt">PDF</span></button>
      <button class="btn" @click="$emit('export-image')" :title="t('导出图片')"><span class="ico">🖼️</span><span class="txt">{{ t('图片') }}</span></button>
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
      >{{ settings.theme === 'dark' ? '☀️' : '🌙' }}</button>
      <button class="btn btn-icon" @click="settings.toggleLang()" :title="settings.lang === 'en' ? t('切换到中文') : t('Switch to English')">
        {{ settings.lang === 'en' ? '中' : 'EN' }}
      </button>
    </div>

    <div class="group zoom-group">
      <button class="btn btn-icon" @click="zoomOut" :title="t('缩小 (Ctrl+-)')" aria-label="缩小">➖</button>
      <div class="zoom-select" :title="t('缩放比例（点击选常用档位）')">
        <select :value="zoomPercent" @change="onZoomPreset($event.target.value)">
          <option v-for="p in zoomOptions" :key="p" :value="p">{{ p }}%</option>
        </select>
      </div>
      <button class="btn btn-icon" @click="zoomIn" :title="t('放大 (Ctrl++)')" aria-label="放大">➕</button>
      <button class="btn btn-icon" @click="zoomReset" :title="t('实际大小 (Ctrl+0)')" aria-label="实际大小 100%">⊙</button>
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

// ============ 窄屏自适应：宽 < 1180px 进入 compact（隐藏按钮文字只剩图标）============
const COMPACT_THRESHOLD = 1180
const isCompact = ref(typeof window !== 'undefined' && window.innerWidth < COMPACT_THRESHOLD)
function onResize() { isCompact.value = window.innerWidth < COMPACT_THRESHOLD }

// 常用缩放档位（设计工具标配：50/75/100/150/200/400）
const zoomPresets = [25, 50, 75, 100, 125, 150, 200, 300, 400]
const zoomPercent = computed(() => Math.round(project.zoom * 100))
const zoomOptions = computed(() => {
  const current = zoomPercent.value
  if (zoomPresets.includes(current)) return zoomPresets
  return [...zoomPresets, current].sort((a, b) => a - b)
})

// 步长：100% 附近用 5%，远区用 10%
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
// 适合窗口：按画布可视区自动算缩放（设计工具标配）；开启后窗口 resize 自动重新适配
function zoomFit() {
  const wrap = document.querySelector('.design-canvas-wrap')
  const z = fitZoomToWindow(wrap, project.project.label.width || 50, project.project.label.height || 30)
  if (z != null) project.zoom = z
  project.autoFit = true
}
function toggleGrid() { project.showGrid = !project.showGrid }

// 全局快捷键：缩放、网格
function onKeydown(e) {
  // 忽略输入框内
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
// Ctrl+滚轮缩放（画布上）
function onWheel(e) {
  if (!e.ctrlKey && !e.metaKey) return
  // 只在画布区域内
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
/* 分组背景：让「配置 / 打印 / 输出」在视觉上分组（设计工具常见：VSCode、Sketch 风格） */
.group-config { background: var(--bg-soft, rgba(99,102,241,0.06)); padding: 2px 6px; border-radius: 6px; }
.group-ops { background: var(--bg-soft, rgba(99,102,241,0.06)); padding: 2px 6px; border-radius: 6px; }
.group-output { background: var(--bg-soft, rgba(16,185,129,0.06)); padding: 2px 6px; border-radius: 6px; }

/* AI 按钮：渐变紫 + 微动效突出 */
.btn-ai {
  background: linear-gradient(135deg, #8b5cf6, #6366f1) !important;
  color: white !important;
  border: none !important;
  position: relative;
  overflow: hidden;
}
.btn-ai::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent);
  transform: translateX(-100%);
  transition: transform 0.4s;
}
.btn-ai:hover::before { transform: translateX(100%); }
.btn-ai:hover { box-shadow: 0 2px 8px rgba(139,92,246,0.4); }

.logo {
  font-weight: 600;
  margin-right: 8px;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
.dirty {
  color: var(--warning);
}
.spacer { flex: 1; }

/* 按钮统一：内嵌 icon + text 标签 */
.btn { display: inline-flex; align-items: center; gap: 4px; }
.btn .ico { font-size: 14px; line-height: 1; }
.btn .txt { white-space: nowrap; }

/* 缩放组：按钮更紧凑 + 下拉百分比替代纯文字 */
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

/* ============ 窄屏 compact：只显示图标、隐藏文字 + 隐藏文件名/Logo 文字 ============ */
.toolbar.compact .logo-text,
.toolbar.compact .filename-text { display: none; }
.toolbar.compact .btn .txt { display: none; }
.toolbar.compact .btn.keep-label .txt { display: inline; }
.toolbar.compact .divider-hide-narrow { display: none; }
.toolbar.compact .group { background: transparent; padding: 0; }
.toolbar.compact .btn { padding: 4px 6px; }

/* 极窄屏：缩放百分比也隐藏（只剩 + - 按钮） */
@media (max-width: 720px) {
  .toolbar.compact .zoom-select { display: none; }
}
</style>
