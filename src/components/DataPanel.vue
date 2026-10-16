<template>
  <div class="data-panel" :class="{ 'is-collapsed': collapsed }">
    <div
      class="data-toolbar"
      role="toolbar"
      :aria-label="t('数据')"
      :class="{ 'menu-open': sampleOpen && !data.headers.length }"
    >
      <button
        type="button"
        class="tool collapse-btn"
        :aria-expanded="!collapsed"
        :aria-controls="bodyId"
        :title="collapsed ? t('展开数据面板') : t('收起数据面板')"
        :aria-label="collapsed ? t('展开数据面板') : t('收起数据面板')"
        @click="toggleCollapsed"
      >
        <svg class="collapse-ico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          <path
            v-if="collapsed"
            d="M4 10.5 8 6.5l4 4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            v-else
            d="M4 5.5 8 9.5l4-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- 左：身份 + 筛选 + 统计 -->
      <div class="tb-meta">
        <span class="title">{{ t('数据') }}</span>
        <label class="filter-wrap" v-if="!collapsed && data.headers.length">
          <span class="sr-only">{{ t('筛选...') }}</span>
          <input
            class="filter-input"
            type="search"
            :placeholder="t('筛选...')"
            :value="data.filter"
            @input="data.setFilter($event.target.value)"
          />
        </label>
        <span
          class="count"
          :title="metaTitle"
        >{{ data.filteredRows.length }} / {{ data.rows.length }} {{ t('行') }} · {{ data.headers.length }} {{ t('列') }}</span>
        <span v-if="data.embedded && data.headers.length" class="badge embedded" :title="data.sourcePath || t('内嵌快照')">{{ t('内嵌') }}</span>
      </div>

      <span class="spacer" aria-hidden="true"></span>

      <!-- 中：编辑类（展开且有表结构时） -->
      <div v-if="!collapsed && data.headers.length" class="tb-cluster">
        <button type="button" class="tool" @click="addEmpty" :title="t('在末尾添加一行')" :aria-label="t('添加行')">+ {{ t('添加行') }}</button>
        <div v-if="data.rows.length" class="sample-wrap" :class="{ open: exportOpen }">
          <button
            type="button"
            class="tool"
            :aria-expanded="exportOpen"
            aria-haspopup="menu"
            @click="openExport"
            :title="t('导出当前数据为 Excel 或 CSV')"
          >{{ t('导出') }} ▾</button>
          <div v-if="exportOpen" class="pop-menu" role="menu" @click.stop>
            <button type="button" class="pop-item" role="menuitem" @click="doExport('xlsx')">{{ t('导出为 Excel (.xlsx)') }}</button>
            <button type="button" class="pop-item" role="menuitem" @click="doExport('csv')">{{ t('导出为 CSV (.csv)') }}</button>
          </div>
        </div>
      </div>

      <!-- 右：空态入口 / 有数据时清空 + 导入（收起时仍保留导入/示例，方便不展开就灌数） -->
      <div class="tb-actions">
        <template v-if="!data.headers.length">
          <div class="sample-wrap">
            <button
              type="button"
              class="tool"
              :aria-expanded="sampleOpen"
              aria-haspopup="menu"
              @click.stop="sampleOpen = !sampleOpen"
            >{{ t('加载示例') }} ▾</button>
            <div v-if="sampleOpen" class="pop-menu" :class="{ 'pop-menu-up': collapsed }" role="menu" @click.stop>
              <button
                v-for="s in samples"
                :key="s.id"
                class="pop-item"
                type="button"
                role="menuitem"
                @click="pickSample(s.id)"
              >{{ t(s.name) }}</button>
            </div>
          </div>
          <button
            v-if="!collapsed"
            type="button"
            class="tool quiet"
            @click="addCol('名称')"
            :title="t('手动建表')"
          >+ {{ t('建表') }}</button>
        </template>
        <button
          v-if="!collapsed && (data.headers.length || data.rows.length)"
          type="button"
          class="tool quiet"
          @click="clearAll"
          :title="t('清空所有数据？')"
          :aria-label="t('清空所有数据？')"
        >{{ t('清空') }}</button>
        <button type="button" class="tool primary" @click="$emit('import')" :title="t('导入 Excel/CSV')">{{ t('导入') }}</button>
      </div>
    </div>

    <div :id="bodyId" class="data-body" v-show="!collapsed">
    <div class="data-grid" v-if="data.headers.length" ref="gridEl" @scroll="onGridScroll">
      <table>
        <thead>
          <tr>
            <th style="width:40px">#</th>
            <th
              v-for="h in data.headers"
              :key="h"
              class="col-h"
              :class="{ sortable: true, 'sort-asc': data.sortKey === h && data.sortDir === 'asc', 'sort-desc': data.sortKey === h && data.sortDir === 'desc' }"
              :style="{ width: colWidths[h] + 'px', minWidth: '60px' }"
            >
              <!-- 编辑态：输入框；非编辑态：单击进入编辑（点击排序需双击） -->
              <input
                v-if="editingCol === h"
                ref="colInput"
                class="col-input"
                :value="editDraft"
                @input="editDraft = $event.target.value"
                @blur="commitRename(h)"
                @keydown.enter.prevent="commitRename(h)"
                @keydown.esc="cancelRename"
                @click.stop
              />
              <span v-else class="col-name" @click="onColClick(h)" @dblclick.stop="onColDblClick(h)" :title="t('单击排序，双击重命名')">
                <span class="col-name-text">{{ h }}</span>
                <span
                  class="sort-arrow"
                  :class="data.sortKey === h ? (data.sortDir === 'asc' ? 'arrow-up' : data.sortDir === 'desc' ? 'arrow-down' : '') : ''"
                  :title="data.sortKey === h ? (data.sortDir === 'asc' ? t('当前升序，点切换降序') : t('当前降序，点清除排序')) : t('点击升序排序')"
                  @click.stop="data.setSort(h)"
                >{{ data.sortKey === h ? (data.sortDir === 'asc' ? '▲' : '▼') : '⇅' }}</span>
              </span>
              <button
                v-if="editingCol !== h"
                class="col-x"
                :title="t('删除该列')"
                @click.stop="delCol(h)"
              >×</button>
              <!-- 列宽拖拽手柄：右侧 4px；双击重置默认 -->
              <span
                class="col-resize"
                @mousedown="startResize($event, h)"
                @dblclick.stop="resetColWidth(h)"
                :title="t('拖拽改列宽，双击重置')"
              ></span>
            </th>
            <th class="add-col-cell" :title="t('添加新列')">
              <button class="add-col" @click="addColWithPrompt()">+</button>
            </th>
            <th style="width:60px">{{ t('操作') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="padTop" class="vpad" :style="{ height: padTop + 'px' }"><td :colspan="colSpan"></td></tr>
          <tr
            v-for="item in visibleRows"
            :key="item.row.__id || item.i"
            :class="{ active: data.activeRowIndex === item.i, vrow: useVirtual }"
            @click="data.setActiveIndex(item.i)"
          >
            <td>{{ item.i + 1 }}</td>
            <td
              v-for="h in data.headers"
              :key="h"
              :style="{ width: colWidths[h] + 'px', maxWidth: colWidths[h] + 'px' }"
            >
              <input
                class="cell-input"
                :value="item.row[h]"
                :title="String(item.row[h] || '').length + '/1000'"
                @input="data.updateRow(item.row.__id, {[h]: $event.target.value})"
                @click.stop
              />
            </td>
            <td></td>
            <td>
              <button class="btn btn-sm" @click.stop="data.removeRow(item.row.__id)" :title="t('删除该行')">×</button>
            </td>
          </tr>
          <tr v-if="!data.rows.length" class="empty-row">
            <td :colspan="colSpan">
              <div class="empty-inline">
                <span class="empty-inline-text">{{ t('表头已就绪，还没有数据行') }}</span>
                <button type="button" class="linkish" @click="addEmpty">+ {{ t('添加行') }}</button>
                <span class="empty-sep" aria-hidden="true">·</span>
                <button type="button" class="linkish" @click="$emit('import')">{{ t('导入') }}</button>
              </div>
            </td>
          </tr>
          <tr v-if="padBottom" class="vpad" :style="{ height: padBottom + 'px' }"><td :colspan="colSpan"></td></tr>
        </tbody>
      </table>
    </div>

    <!-- 空状态：动作全在工具栏，这里只留安静引导 -->
    <div v-else class="empty">
      <div class="empty-sheet" aria-hidden="true">
        <span class="empty-rule"></span>
        <span class="empty-rule short"></span>
        <span class="empty-rule"></span>
      </div>
      <p class="empty-copy">{{ t('还没有数据') }}</p>
      <p class="empty-hint">{{ t('下一步：用工具栏导入表格，或加载示例 / 建表') }}</p>
    </div>
    </div>

    <div v-if="sampleOpen" class="pop-mask" @click="sampleOpen = false"></div>
    <div v-if="exportOpen" class="pop-mask" @click="exportOpen = false"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useDataStore } from '../stores/data'
import { useI18n } from '../utils/i18n'
import { toastError, toastSuccess } from '../utils/toast'
import { SAMPLE_DATASETS } from '../utils/samples'
const { t } = useI18n()
const data = useDataStore()

// 行数多了才虚拟滚动，少的时候整表渲染，选中行号不变
const ROW_H = 33
const OVERSCAN = 8
const VIRTUAL_MIN = 80
const gridEl = ref(null)
const scrollTop = ref(0)
const viewH = ref(400)
const useVirtual = computed(() => data.displayRows.length > VIRTUAL_MIN)
const colSpan = computed(() => data.headers.length + 3)
const startIndex = computed(() => {
  if (!useVirtual.value) return 0
  const raw = Math.floor(scrollTop.value / ROW_H) - OVERSCAN
  return Math.max(0, Math.min(raw, data.displayRows.length))
})
const visibleRows = computed(() => {
  const rows = data.displayRows
  if (!useVirtual.value) return rows.map((row, i) => ({ row, i }))
  const start = startIndex.value
  const count = Math.ceil(viewH.value / ROW_H) + OVERSCAN * 2
  const end = Math.min(rows.length, start + count)
  const out = []
  for (let i = start; i < end; i++) out.push({ row: rows[i], i })
  return out
})
const padTop = computed(() => useVirtual.value ? startIndex.value * ROW_H : 0)
const padBottom = computed(() => {
  if (!useVirtual.value) return 0
  const end = visibleRows.value.length ? visibleRows.value[visibleRows.value.length - 1].i + 1 : 0
  return Math.max(0, (data.displayRows.length - end) * ROW_H)
})
function onGridScroll(e) {
  scrollTop.value = e.target.scrollTop
  viewH.value = e.target.clientHeight || viewH.value
}
let gridObserver = null
onMounted(() => {
  const el = gridEl.value
  if (!el) return
  viewH.value = el.clientHeight || 400
  if (typeof ResizeObserver !== 'undefined') {
    gridObserver = new ResizeObserver(() => { viewH.value = el.clientHeight || 400 })
    gridObserver.observe(el)
  }
})

const emit = defineEmits(['import', 'load-sample'])
const sampleOpen = ref(false)
const exportOpen = ref(false)
const samples = SAMPLE_DATASETS
const bodyId = 'data-panel-body'

const COLLAPSE_KEY = 'labelprint_data_panel_collapsed'
const collapsed = ref(false)
try {
  collapsed.value = localStorage.getItem(COLLAPSE_KEY) === '1'
} catch { /* ignore */ }

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  if (collapsed.value) {
    sampleOpen.value = false
    exportOpen.value = false
  }
  try { localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0') } catch { /* ignore */ }
}
function openExport() { exportOpen.value = !exportOpen.value }

const metaTitle = computed(() => {
  const parts = []
  if (data.sourcePath) parts.push(data.sourcePath)
  if (data.embedded) parts.push(t('内嵌快照'))
  return parts.join(' · ') || t('数据')
})

function pickSample(id) {
  sampleOpen.value = false
  emit('load-sample', id)
}

// ============ 列宽管理 ============
// 默认列宽 140，存 localStorage 跨刷新
const COL_W_KEY = 'labelprint_data_colwidths_v1'
const DEFAULT_COL_W = 140
const MIN_COL_W = 50
const MAX_COL_W = 600
const colWidths = reactive({})

function loadColWidths() {
  try {
    const raw = localStorage.getItem(COL_W_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      for (const k in saved) {
        if (typeof saved[k] === 'number' && saved[k] >= MIN_COL_W && saved[k] <= MAX_COL_W) {
          colWidths[k] = Math.round(saved[k])
        }
      }
    }
  } catch (e) { /* 忽略 */ }
}
function saveColWidths() {
  try { localStorage.setItem(COL_W_KEY, JSON.stringify({ ...colWidths })) } catch (e) {}
}
// 启动时读 + 监听现有 headers 补默认宽
loadColWidths()
data.headers.forEach(h => { if (!(h in colWidths)) colWidths[h] = DEFAULT_COL_W })
// 字段新增/删除时同步列宽
function ensureColWidth(h) { if (!(h in colWidths)) colWidths[h] = DEFAULT_COL_W }
function dropColWidth(h) { delete colWidths[h] }

function resetColWidth(h) {
  colWidths[h] = DEFAULT_COL_W
  saveColWidths()
}

// 拖拽：mousedown 在 resize 手柄上，记录起始 x + 起始宽
let resizing = null
function startResize(e, h) {
  e.preventDefault()
  e.stopPropagation()
  const startX = e.clientX
  const startW = colWidths[h] || DEFAULT_COL_W
  resizing = { h, startX, startW }
  const onMove = (ev) => {
    const next = Math.min(MAX_COL_W, Math.max(MIN_COL_W, startW + (ev.clientX - startX)))
    colWidths[resizing.h] = Math.round(next)
  }
  const onUp = () => {
    if (resizing) saveColWidths()
    resizing = null
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.body.style.cursor = 'col-resize'
}
onBeforeUnmount(() => {
  document.body.style.cursor = ''
  gridObserver?.disconnect()
})

// ============ 列重命名编辑态 ============
const editingCol = ref('')
const editDraft = ref('')
const colInput = ref(null)

let colClickTimer = null
function onColClick(name) {
  clearTimeout(colClickTimer)
  colClickTimer = setTimeout(() => data.setSort(name), 220)
}
function onColDblClick(name) {
  clearTimeout(colClickTimer)
  startRename(name)
}

function startRename(name) {
  editingCol.value = name
  editDraft.value = name
  nextTick(() => {
    // 自动聚焦 + 选中字段名（不含"_"后缀），方便输入
    const el = colInput.value
    if (el && el.focus) {
      el.focus()
      try { el.setSelectionRange(0, name.length) } catch {}
    }
  })
}

function commitRename(oldName) {
  if (!editingCol.value) return
  const v = editDraft.value.trim()
  if (v && v !== oldName) {
    try {
      data.renameColumn(oldName, v)
      // 迁移列宽 + 同步排序
      if (oldName in colWidths) {
        colWidths[v] = colWidths[oldName]
        delete colWidths[oldName]
        saveColWidths()
      }
      if (data.sortKey === oldName) data.setSort(v)  // 触发重新计算（保留方向）
    } catch (e) {
      toastError(e.message || t('重命名失败'))
    }
  }
  editingCol.value = ''
  editDraft.value = ''
}

function cancelRename() {
  editingCol.value = ''
  editDraft.value = ''
}

// ============ 添加 / 删除列 ============
function addCol(name) {
  const newName = data.addColumn(name || '')
  if (newName) ensureColWidth(newName)
}
// 点击表头加号：弹 prompt 让用户输入字段名
function addColWithPrompt() {
  const name = prompt(t('请输入新字段名（留空自动命名）'))
  if (name === null) return
  addCol(name)
}

function delCol(name) {
  if (!confirm(t('删除列 "{name}" 及其所有数据？', { name }))) return
  try {
    data.removeColumn(name)
    if (editingCol.value === name) cancelRename()
    if (data.sortKey === name) { data.sortKey = ''; data.sortDir = '' }
    dropColWidth(name); saveColWidths()
  } catch (e) {
    toastError(e.message || t('删除失败'))
  }
}

// ============ 行 ============
function addEmpty() {
  if (!data.headers.length) {
    addColWithPrompt()
    return
  }
  const row = {}
  data.headers.forEach(h => row[h] = '')
  data.addRow(row)
}

function clearAll() {
  if (!confirm(t('清空所有数据？'))) return
  data.clear()
  toastSuccess(t('已清空数据'))
}

// ============ 导出 ============
async function doExport(fmt) {
  exportOpen.value = false
  const ts = new Date().toISOString().slice(0, 16).replace(/[:T-]/g, '')
  const base = data.sourcePath ? data.sourcePath.replace(/\.[^.]+$/, '') : 'data'
  const filename = `${base}_${ts}.${fmt}`
  try {
    const excel = await import('../utils/excel')
    if (fmt === 'xlsx') await excel.exportToExcel(data.headers, data.rows, filename)
    else excel.exportToCSV(data.headers, data.rows, filename)
    toastSuccess(t('导出成功'))
  } catch (e) {
    toastError(t('导出失败：{msg}', { msg: e.message || e }))
  }
}
</script>

<style scoped>
.data-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}
.data-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.collapse-btn {
  flex-shrink: 0;
  width: 28px;
  min-width: 28px;
  height: 28px;
  padding: 0;
}
.collapse-ico {
  display: block;
  flex-shrink: 0;
}

/* —— 工具栏：左 meta | 中编辑簇 | 右动作 —— */
.data-toolbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 4px 10px;
  border-bottom: 1px solid var(--border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-panel) 92%, var(--primary) 6%), var(--bg-panel));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--bg) 60%, transparent);
}
.data-panel.is-collapsed .data-toolbar {
  min-height: 36px;
  height: 100%;
  padding: 0 10px;
  border-bottom: 0;
  box-shadow: none;
}
.tb-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 1;
}
.title {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--text);
  flex-shrink: 0;
}
.filter-wrap { display: inline-flex; min-width: 0; }
.filter-input {
  width: 140px;
  max-width: 22vw;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-soft, var(--bg));
  color: var(--text);
  font-size: 12px;
  outline: none;
}
.filter-input:focus-visible {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 22%, transparent);
}
.count {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  white-space: nowrap;
}
.badge {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.badge.embedded {
  background: color-mix(in srgb, var(--warning, #f59e0b) 18%, transparent);
  color: color-mix(in srgb, var(--warning, #b45309) 70%, var(--text));
  border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 35%, transparent);
}
.spacer { flex: 1; min-width: 8px; }

.tb-cluster,
.tb-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--bg-soft, var(--bg));
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  flex-shrink: 0;
}
.tb-actions { margin-left: 2px; }

.tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
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
.tool.primary {
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}
.tool.primary:hover:not(:disabled) {
  background: var(--primary-hover);
  color: #fff;
}
.tool.quiet {
  color: var(--text-muted);
  font-weight: 500;
}
.tool.quiet:hover:not(:disabled) {
  color: var(--text);
}

.sample-wrap { position: relative; }
/* 工具栏与遮罩是兄弟：打开菜单时整条抬高，子级 z-index 才点得着 */
.data-toolbar.menu-open { z-index: 30; }
.pop-mask { position: fixed; inset: 0; z-index: 20; }
.pop-menu {
  position: absolute;
  z-index: 1;
  right: 0;
  top: calc(100% + 4px);
  min-width: 168px;
  max-height: min(240px, 40vh);
  overflow-y: auto;
  padding: 4px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px color-mix(in srgb, #000 14%, transparent);
  display: flex;
  flex-direction: column;
  overscroll-behavior: contain;
}
/* 收起条贴底：菜单向上开，避免被视口裁切 */
.pop-menu-up {
  top: auto;
  bottom: calc(100% + 4px);
}
.pop-item {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  border-radius: 6px;
}
.pop-item:hover { background: var(--bg-hover); }
.pop-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

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

.data-grid {
  flex: 1;
  overflow: auto;
  padding: 4px;
}
table { border-collapse: collapse; font-size: 12px; table-layout: fixed; }  /* fixed 让列宽生效 */
th, td {
  border: 1px solid var(--border);
  padding: 4px 6px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
th { background: var(--bg); position: sticky; top: 0; z-index: 1; box-shadow: 0 1px 0 var(--border); }  /* box-shadow 兜底：collapse 下滚动时 th 底边框会被表格层吃掉 */
tr.vrow { height: 33px; }
tr.vpad td { padding: 0; border: none; }
tr.active td { background: var(--row-active-bg, #dbeafe); color: var(--row-active-text, #1e3a8a); }
tr.active td .cell-input { color: inherit; }
.cell-input {
  border: none;
  background: transparent;
  width: 100%;
  outline: none;
  padding: 2px;
  color: inherit;
}
.cell-input:focus { background: var(--bg-panel); }

/* 列头：可点击重命名 + 悬停显示删除 */
.col-h {
  /* 注意：不能写 position: relative —— 会覆盖 th 的 position: sticky，
     导致纵向滚动时数据列头不冻结（# / 操作 列头没有此类所以正常）。
     sticky 本身就是 positioned，可为内部 absolute 的 col-resize 提供定位上下文。 */
  padding-right: 22px !important;
  cursor: text;
  user-select: none;
}
.col-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 40px;
  max-width: 100%;
  cursor: text;
}
.col-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
/* 排序箭头：默认灰色轻提示；当前列排序时高亮 */
.sort-arrow {
  font-size: 10px;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 2px;
  border-radius: 2px;
  flex-shrink: 0;
  user-select: none;
}
.sort-arrow:hover { background: var(--bg-hover); color: var(--primary); }
.col-h.sort-asc .sort-arrow,
.col-h.sort-desc .sort-arrow { color: var(--primary); font-weight: 600; }
/* 列宽拖拽手柄：右侧 4px；hover 时显示蓝色线 */
.col-resize {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  z-index: 2;
}
.col-resize:hover { background: var(--primary); opacity: 0.4; }
.col-h .col-x {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  opacity: 0;
  border-radius: 3px;
}
.col-h:hover .col-x { opacity: 0.8; }
.col-h .col-x:hover { opacity: 1; background: var(--danger); color: #fff; }
.col-input {
  width: 100%;
  border: 1px solid var(--primary);
  outline: none;
  padding: 1px 3px;
  background: var(--bg-panel);
  color: inherit;
  border-radius: 3px;
  font-size: 12px;
}
.add-col-cell { width: 28px; padding: 2px !important; }
.add-col {
  width: 22px; height: 22px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 3px;
  font-size: 14px;
  line-height: 1;
}
.add-col:hover { border-color: var(--primary); color: var(--primary); border-style: solid; }

/* 空状态：安静工作台，动作只在工具栏 */
.empty {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px 20px;
  text-align: center;
  background:
    radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in srgb, var(--primary) 6%, transparent), transparent 70%);
}
.empty-sheet {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 44px;
  padding: 10px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
  background: color-mix(in srgb, var(--bg-panel) 80%, var(--bg));
  box-shadow: 0 1px 0 color-mix(in srgb, var(--border) 50%, transparent);
}
.empty-rule {
  display: block;
  height: 2px;
  border-radius: 1px;
  background: color-mix(in srgb, var(--border) 85%, var(--text-muted));
}
.empty-rule.short { width: 58%; }
.empty-copy {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
}
.empty-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
  max-width: 280px;
  line-height: 1.45;
}
.empty-row td { background: var(--bg); }
.empty-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 18px 12px;
  text-align: center;
}
.empty-inline-text {
  width: 100%;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.empty-sep { color: var(--text-muted); opacity: 0.5; }
.linkish {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}
.linkish:hover { text-decoration: underline; }
.linkish:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}

@media (max-width: 720px) {
  .filter-input { width: 100px; }
  .count { display: none; }
  .badge { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tool { transition: none; }
}
</style>
