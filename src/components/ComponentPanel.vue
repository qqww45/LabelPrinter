<template>
  <div class="component-panel" :class="{ 'only-mode': !!only }">
    <div v-if="!only" class="rail-tabs" role="tablist" :aria-label="t('设计面板')">
      <button
        role="tab"
        type="button"
        class="rail-tab"
        :class="{ on: activeView === 'components' }"
        :aria-selected="activeView === 'components'"
        @click="setTab('components')"
      >{{ t('组件') }}</button>
      <button
        role="tab"
        type="button"
        class="rail-tab"
        :class="{ on: activeView === 'layers' }"
        :aria-selected="activeView === 'layers'"
        @click="setTab('layers')"
      >
        {{ t('图层') }}
        <span v-if="project.project.components.length" class="tab-count">{{ project.project.components.length }}</span>
      </button>
    </div>

    <div v-show="activeView === 'components'" class="section section-fill" role="tabpanel">
      <p class="section-lead">{{ t('点击添加，或拖到画布指定位置') }}</p>
      <div class="components-grid">
        <div
          v-for="item in componentTypes"
          :key="item.type"
          class="component-item"
          :draggable="true"
          @dragstart="onDragStart($event, item.type)"
          @dragend="onDragEnd"
          @click="onItemClick(item.type)"
          :title="t('点击添加到画布，或拖到指定位置') + ' ' + item.name"
        >
          <div class="icon" v-html="item.svg"></div>
          <div class="name">{{ t(item.name) }}</div>
        </div>
      </div>
    </div>

    <div v-show="activeView === 'layers'" class="section section-fill" role="tabpanel">
      <div v-if="!only" class="section-title">
        <span>{{ t('图层') }}
          <span class="hint" v-if="project.project.components.length">{{ project.selectedIds.length }} / {{ project.project.components.length }}</span>
        </span>
      </div>
      <p v-else class="section-lead">
        {{ project.project.components.length
          ? t('已选 {n} / 共 {m}', { n: project.selectedIds.length, m: project.project.components.length })
          : t('画布为空') }}
      </p>
      <div v-if="!project.project.components.length" class="empty">
        {{ t('画布为空') }}
      </div>
      <div v-else class="layers">
        <div
          v-for="c in [...project.project.components].reverse()"
          :key="c.id"
          class="layer-item"
          :class="{ active: project.selectedIds.includes(c.id), primary: project.selectedId === c.id, 'drag-over': dragOverId === c.id, hidden: c.hidden }"
          draggable="true"
          @dragstart="onLayerDragStart($event, c)"
          @dragover.prevent="onLayerDragOver(c)"
          @dragleave="onLayerDragLeave(c)"
          @drop.prevent="onLayerDrop($event, c)"
          @dragend="dragOverId = null"
          @click="onLayerClick(c, $event)"
        >
          <span class="layer-grip" :title="t('拖动调整上下层')">⠿</span>
          <span class="layer-icon">{{ iconOf(c.type) }}</span>
          <img v-if="c.type === 'image' && c.src" class="layer-thumb" :src="c.src" :title="c.name || '图片'" />
          <span v-else-if="c.type === 'image'" class="layer-thumb layer-thumb-empty" :title="t('未上传图片')">{{ t('空') }}</span>
          <span class="layer-name">{{ c.name || labelOf(c) }}</span>
          <button class="layer-eye" type="button" @click.stop="project.updateComponent(c.id, { hidden: !c.hidden })" :title="c.hidden ? t('显示') : t('隐藏')" :aria-label="c.hidden ? t('显示') : t('隐藏')">{{ c.hidden ? '◌' : '👁' }}</button>
          <button class="layer-order" type="button" @click.stop="project.bringForward(c.id)" :title="t('上移一层')" :aria-label="t('上移一层')">↑</button>
          <button class="layer-order" type="button" @click.stop="project.sendBackward(c.id)" :title="t('下移一层')" :aria-label="t('下移一层')">↓</button>
          <button class="layer-del" type="button" @click.stop="onLayerDelete(c, $event)" :title="t('删除')" :aria-label="t('删除')">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useProjectStore } from '../stores/project'
import { useI18n } from '../utils/i18n'
const { t } = useI18n()
import { ref, computed } from 'vue'

const props = defineProps({
  /** LeftDock 指定只显示组件或图层 */
  only: { type: String, default: '' } // '' | 'components' | 'layers'
})

const project = useProjectStore()
const TAB_KEY = 'labelprint_left_tab'
const tab = ref(localStorage.getItem(TAB_KEY) === 'layers' ? 'layers' : 'components')
function setTab(name) {
  tab.value = name
  try { localStorage.setItem(TAB_KEY, name) } catch {}
}
const activeView = computed(() => {
  if (props.only === 'components' || props.only === 'layers') return props.only
  return tab.value
})

// SVG 缩略图（viewBox 40×40），用 currentColor 跟随主题
function svgText() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <text x="20" y="28" text-anchor="middle" font-family="serif" font-size="24" font-weight="700" fill="currentColor">Aa</text>
    <line x1="6" y1="33" x2="34" y2="33" stroke="currentColor" stroke-width="1.5"/>
  </svg>`
}
function svgImage() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="32" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="13" cy="15" r="3" fill="currentColor"/>
    <path d="M6 30 L16 22 L22 27 L28 20 L34 28 L34 32 L6 32 Z" fill="currentColor" opacity="0.7"/>
  </svg>`
}
function svgTable() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="32" height="28" fill="none" stroke="currentColor" stroke-width="1.2"/>
    <line x1="4" y1="16" x2="36" y2="16" stroke="currentColor" stroke-width="1"/>
    <line x1="4" y1="24" x2="36" y2="24" stroke="currentColor" stroke-width="1"/>
    <line x1="16" y1="6" x2="16" y2="34" stroke="currentColor" stroke-width="1"/>
    <line x1="26" y1="6" x2="26" y2="34" stroke="currentColor" stroke-width="1"/>
    <rect x="4" y="6" width="32" height="10" fill="currentColor" opacity="0.18"/>
  </svg>`
}
function svgQR() {
  // 7×7 黑白方格模拟二维码（粗糙但有辨识度）
  let cells = ''
  // 固定图案：3 定位点 + 随机填充
  const pattern = [
    '1111111',
    '1000001',
    '1011101',
    '1011101',
    '1011101',
    '1000001',
    '1111111'
  ]
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if (pattern[y][x] === '1') {
        cells += `<rect x="${6 + x * 4}" y="${6 + y * 4}" width="3.6" height="3.6" fill="currentColor"/>`
      } else {
        // 模拟数据
        if ((x * 7 + y) % 3 === 0) {
          cells += `<rect x="${6 + x * 4}" y="${6 + y * 4}" width="3.6" height="3.6" fill="currentColor"/>`
        }
      }
    }
  }
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">${cells}</svg>`
}
function svgBarcode() {
  // 一组粗细不一的竖条
  const bars = [
    { x: 4, w: 1.5 }, { x: 6.5, w: 0.8 }, { x: 8, w: 2 }, { x: 11, w: 0.8 },
    { x: 12.5, w: 1.5 }, { x: 15, w: 0.8 }, { x: 16.5, w: 2.5 }, { x: 20, w: 0.8 },
    { x: 21.5, w: 1.5 }, { x: 24, w: 0.8 }, { x: 25.5, w: 2 }, { x: 28.5, w: 0.8 },
    { x: 30, w: 1.5 }, { x: 32.5, w: 0.8 }, { x: 34, w: 2 }
  ]
  let s = ''
  for (const b of bars) s += `<rect x="${b.x}" y="6" width="${b.w}" height="28" fill="currentColor"/>`
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">${s}</svg>`
}
function svgRect() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8" width="30" height="24" rx="3" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.5"/>
  </svg>`
}
function svgLine() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <line x1="6" y1="34" x2="34" y2="6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`
}
function svgDate() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8" width="30" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="5" y1="16" x2="35" y2="16" stroke="currentColor" stroke-width="1.5"/>
    <line x1="12" y1="5" x2="12" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="28" y1="5" x2="28" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <text x="20" y="30" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">31</text>
  </svg>`
}
function svgEllipse() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="20" rx="14" ry="10" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
  </svg>`
}
function svgSerial() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <text x="20" y="26" text-anchor="middle" font-family="monospace" font-size="14" font-weight="700" fill="currentColor">No.01</text>
  </svg>`
}
function svgCheckbox() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="24" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M14 20 L18 25 L27 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

const componentTypes = [
  { type: 'text',     name: '文本',     svg: svgText() },
  { type: 'image',    name: '图片',     svg: svgImage() },
  { type: 'table',    name: '表格',     svg: svgTable() },
  { type: 'qrcode',   name: '二维码',   svg: svgQR() },
  { type: 'barcode',  name: '条形码',   svg: svgBarcode() },
  { type: 'rect',     name: '矩形',     svg: svgRect() },
  { type: 'ellipse',  name: '椭圆',     svg: svgEllipse() },
  { type: 'line',     name: '直线',     svg: svgLine() },
  { type: 'date',     name: '日期',     svg: svgDate() },
  { type: 'serial',   name: '序号',     svg: svgSerial() },
  { type: 'checkbox', name: '勾选框',   svg: svgCheckbox() }
]

const typeNames = { text: '文本', image: '图片', table: '表格', qrcode: '二维码', barcode: '条形码', rect: '矩形', ellipse: '椭圆', line: '直线', date: '日期', serial: '序号', checkbox: '勾选框' }
const icons = { text: 'A', image: '🖼', table: '⊞', qrcode: '▣', barcode: '▌', rect: '▭', ellipse: '⬭', line: '╱', date: '📅', serial: '#', checkbox: '☑' }

function iconOf(t) { return icons[t] || '·' }
function labelOf(c) {
  if (c.type === 'text' && c.text) return c.text.slice(0, 8)
  return t(typeNames[c.type] || c.type)
}

// 图层多选交互：
// - 单击：单选（清其他）
// - Ctrl/Cmd + 点击：加选 / 取消（toggle）
// - Shift + 点击：范围选（从当前主选到目标）
function onLayerClick(c, e) {
  // 关键修复：使用 e.ctrlKey/e.shiftKey/e.metaKey（MouseEvent 自带）
  // 但为保险，e._key/也检查 e.button=0 避免右键触发
  if (e.button !== 0) return
  const hasCtrl = !!(e.ctrlKey || e.metaKey)
  const hasShift = !!e.shiftKey
  if (hasCtrl) {
    project.selectToggle(c.id)
  } else if (hasShift) {
    project.selectRange(c.id)
  } else {
    // 单击：若已在选中集中（且选中数 > 1）则保持；否则单选
    if (project.selectedIds.length > 1 && project.selectedIds.includes(c.id)) {
      // 多选下点已选中的项：保持（避免点空白外清空）
      project.selectOne(c.id)
    } else {
      project.selectOne(c.id)
    }
  }
}

function onLayerDelete(c, e) {
  if (project.selectedIds.length > 1 && project.selectedIds.includes(c.id)) {
    if (!confirm(t('确定要删除选中的 {n} 个组件？').replace('{n}', project.selectedIds.length))) return
    project.removeSelected()
  } else {
    project.removeComponent(c.id)
  }
}

let dragged = false
function onDragStart(e, type) {
  dragged = true
  e.dataTransfer.setData('component-type', type)
  e.dataTransfer.effectAllowed = 'copy'
}
function onDragEnd() {
  // click 紧跟在 dragend 后面，延后清标记，避免拖完又在中心加一个
  setTimeout(() => { dragged = false }, 0)
}
function onItemClick(type) {
  if (dragged) return
  project.requestAddComponent(type)
}

// ============ 图层拖动排序（数组越靠后 = 层叠越靠上；列表倒序显示，视觉越靠上 = 数组越靠后） ============
const dragOverId = ref(null)

function onLayerDragStart(e, c) {
  e.dataTransfer.setData('layer-id', c.id)
  e.dataTransfer.effectAllowed = 'move'
}
function onLayerDragOver(c) {
  dragOverId.value = c.id
}
function onLayerDragLeave(c) {
  if (dragOverId.value === c.id) dragOverId.value = null
}
function onLayerDrop(e, target) {
  dragOverId.value = null
  const dragId = e.dataTransfer.getData('layer-id')
  if (!dragId || dragId === target.id) return
  // 列表是倒序显示的：把目标在"显示顺序"里的位置换算回数组索引
  const arr = project.project.components
  const n = arr.length
  const targetVisIdx = n - 1 - arr.findIndex(x => x.id === target.id)
  const dragVisIdx = n - 1 - arr.findIndex(x => x.id === dragId)
  // 从下往上拖（dragVisIdx > targetVisIdx）= 提高层叠：放到目标之上（数组索引 = 目标索引 + 1）
  // 从上往下拖 = 降低层叠：放到目标原位置
  const toArrIdx = dragVisIdx > targetVisIdx
    ? n - 1 - targetVisIdx + 1
    : n - 1 - targetVisIdx
  project.reorderComponent(dragId, toArrIdx)
}

</script>

<style scoped>
.component-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.component-panel.only-mode .section-fill {
  padding-top: 8px;
}
.rail-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 8px 8px 0;
  flex-shrink: 0;
  background: var(--bg-panel);
}
.rail-tab {
  position: relative;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 8px 6px 10px;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
}
.rail-tab:hover { color: var(--text); background: var(--bg-hover); }
.rail-tab.on {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, var(--bg));
}
.rail-tab.on::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--primary);
}
.rail-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}
.tab-count {
  display: inline-block;
  margin-left: 4px;
  min-width: 16px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  background: var(--bg-soft, var(--bg));
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.rail-tab.on .tab-count {
  background: color-mix(in srgb, var(--primary) 18%, transparent);
  color: var(--primary);
}
.section {
  padding: 10px 12px 12px;
  border-bottom: 1px solid var(--border);
}
.section-fill {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  border-bottom: 0;
}
.section-lead {
  margin: 0 0 10px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.hint {
  font-weight: normal;
  font-size: 11px;
  color: var(--text-muted);
}
/* 实时按键状态：让用户看见"是否按了 Ctrl/Shift/⌘" */
.layer-tips {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: var(--text-muted);
  font-weight: normal;
}
.layer-tips .tip {
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-family: ui-monospace, SFMono-Regular, monospace;
  transition: background-color 0.1s ease, border-color 0.1s ease, color 0.1s ease;
}
.layer-tips .tip.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}
.layer-tips .tip-sep {
  color: var(--text-muted);
  margin: 0 1px;
}
/* 始终可见的快捷键提示行 */
.layer-hint-row {
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--bg-soft, rgba(99, 102, 241, 0.06));
  padding: 4px 6px;
  border-radius: 3px;
  margin-bottom: 6px;
  line-height: 1.4;
  border-left: 2px solid var(--primary);
}
.components-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.component-item {
  padding: 8px 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  text-align: center;
  cursor: grab;
  user-select: none;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}
.component-item:hover {
  border-color: var(--primary);
  background: var(--bg-panel);
  transform: translateY(-1px);
}
.component-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
@media (prefers-reduced-motion: reduce) {
  .component-item { transition: none; }
  .component-item:hover { transform: none; }
}
.component-item:active {
  cursor: grabbing;
}
.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  color: var(--primary);
}
.icon :deep(svg) {
  width: 40px;
  height: 40px;
  display: block;
}
.name { font-size: 11px; margin-top: 2px; color: var(--text-secondary); }
.empty {
  padding: 20px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
.fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-item {
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: grab;
  font-size: 12px;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}
.field-item:hover {
  border-color: var(--primary);
  background: white;
}
.field-item:active { cursor: grabbing; }
.field-name {
  flex: 1;
  cursor: text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.field-x {
  width: 18px; height: 18px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
}
.field-item:hover .field-x { opacity: 0.8; }
.field-x:hover { opacity: 1; background: var(--danger); color: #fff; }
.field-input {
  flex: 1;
  border: 1px solid var(--primary);
  outline: none;
  padding: 1px 4px;
  background: var(--bg-panel);
  color: inherit;
  border-radius: 3px;
  font-size: 12px;
  min-width: 0;
}
.section-add {
  width: 22px; height: 22px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
}
.section-add:hover { border-color: var(--primary); color: var(--primary); border-style: solid; }
.empty-btn {
  margin-top: 10px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 12px;
}
.empty-btn:hover { border-color: var(--primary); color: var(--primary); border-style: solid; }
.layers {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.layer-item {
  padding: 5px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.layer-item:hover { background: var(--bg-hover); }
.layer-item.active {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--text);
}
.layer-item.active.primary {
  background: var(--primary);
  color: white;
}
.layer-item.active.primary .layer-name,
.layer-item.active.primary .layer-icon { color: white; }
.layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layer-thumb {
  width: 22px;
  height: 22px;
  border-radius: 3px;
  object-fit: cover;
  background: var(--bg);
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.layer-thumb-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-muted);
}
.layer-del {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
}
.layer-del:hover { background: var(--danger); color: white; }
.layer-grip {
  cursor: grab;
  color: var(--text-muted);
  font-size: 12px;
  user-select: none;
  flex-shrink: 0;
}
.layer-item:active .layer-grip { cursor: grabbing; }
.layer-order {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1;
}
.layer-order:hover { background: var(--primary); color: white; }
.layer-eye {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
}
.layer-eye:hover { background: var(--bg-hover); color: var(--text); }
.layer-item.hidden { opacity: 0.45; }
.layer-item.hidden .layer-name { text-decoration: line-through; }
.layer-item.drag-over {
  outline: 2px dashed var(--primary);
  outline-offset: -2px;
}
</style>
