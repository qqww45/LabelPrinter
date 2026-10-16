<template>
  <div class="data-panel">
    <div class="data-toolbar">
      <span class="title">{{ t('数据') }}</span>
      <input class="input" style="width:160px" :placeholder="t('筛选...')" :value="data.filter"
        @input="data.setFilter($event.target.value)" />
      <span v-if="data.sourcePath" class="src">{{ data.sourcePath }}</span>
      <span v-if="data.embedded" class="badge embedded">{{ t('内嵌快照') }}</span>
      <span class="count">{{ data.filteredRows.length }} / {{ data.rows.length }} {{ t('行') }} · {{ data.headers.length }} {{ t('列') }}</span>

      <span class="spacer"></span>

      <button v-if="data.headers.length" class="btn btn-sm" @click="addEmpty" :title="t('在末尾添加一行')">+ {{ t('添加行') }}</button>
      <button v-if="data.rows.length" class="btn btn-sm" @click="openExport" :title="t('导出当前数据为 Excel 或 CSV')">{{ t('导出') }}</button>
      <button v-if="data.headers.length || data.rows.length" class="btn btn-sm" @click="clearAll">{{ t('清空') }}</button>
      <button class="btn btn-sm btn-primary" @click="$emit('import')">{{ t('导入 Excel/CSV') }}</button>
    </div>

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
                <div class="empty-title">{{ t('表头已就绪，还没有数据行') }}</div>
                <div class="empty-sub">{{ t('添加一行开始填写，或继续导入更多数据') }}</div>
                <div class="empty-actions">
                  <button class="btn btn-sm" @click="addEmpty">+ {{ t('添加行') }}</button>
                  <button class="btn btn-sm btn-primary" @click="$emit('import')">{{ t('导入 Excel/CSV') }}</button>
                </div>
              </div>
            </td>
          </tr>
          <tr v-if="padBottom" class="vpad" :style="{ height: padBottom + 'px' }"><td :colspan="colSpan"></td></tr>
        </tbody>
      </table>
    </div>

    <!-- 空状态：没有任何字段 → 引导建表 / 导入 -->
    <div v-else class="empty">
      <div class="empty-glyph" aria-hidden="true"></div>
      <div class="empty-title">{{ t('还没有数据') }}</div>
      <div class="empty-sub">{{ t('从这里开始：') }}</div>
      <div class="empty-actions">
        <button class="btn" @click="addCol('名称')">+ {{ t('手动建表（添加字段）') }}</button>
        <button class="btn btn-primary" @click="$emit('import')">{{ t('导入 Excel/CSV') }}</button>
      </div>
    </div>

    <!-- 导出菜单（点击外部关闭） -->
    <div v-if="exportOpen" class="export-menu" @click.stop>
      <button class="export-item" @click="doExport('xlsx')">{{ t('导出为 Excel (.xlsx)') }}</button>
      <button class="export-item" @click="doExport('csv')">{{ t('导出为 CSV (.csv)') }}</button>
    </div>
    <div v-if="exportOpen" class="export-mask" @click="exportOpen = false"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useDataStore } from '../stores/data'
import { useI18n } from '../utils/i18n'
import { toastError, toastSuccess } from '../utils/toast'
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

defineEmits(['import'])

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
const exportOpen = ref(false)
function openExport() { exportOpen.value = !exportOpen.value }
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
.data-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.title { font-weight: 600; margin-right: 4px; }
.src { font-size: 12px; color: var(--text-secondary); }
.badge { padding: 1px 6px; border-radius: 10px; font-size: 11px; }
.badge.embedded { background: #fef3c7; color: #92400e; }
.badge.external { background: #dbeafe; color: #1e40af; }
.count { font-size: 12px; color: var(--text-muted); }
.spacer { flex: 1; }
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

/* 空状态 */
.empty {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  text-align: center;
  gap: 6px;
}
.empty-glyph {
  width: 36px; height: 28px; border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--bg-soft);
  position: relative;
  margin-bottom: 4px;
}
.empty-glyph::before,
.empty-glyph::after {
  content: '';
  position: absolute; left: 6px; right: 6px; height: 2px;
  background: var(--border); border-radius: 1px;
}
.empty-glyph::before { top: 9px; }
.empty-glyph::after { top: 15px; width: 55%; right: auto; }
.empty-title { font-size: 15px; color: var(--text-secondary); font-weight: 500; }
.empty-sub { font-size: 12px; color: var(--text-muted); }
.empty-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; justify-content: center; }
.empty-row td { background: var(--bg); }
.empty-inline {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 28px 12px; text-align: center;
}

/* 导出菜单 */
.export-mask { position: fixed; inset: 0; z-index: 9; }
.export-menu {
  position: absolute;
  right: 16px;
  top: 40px;
  z-index: 10;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 200px;
  display: flex;
  flex-direction: column;
  padding: 4px;
}
.export-item {
  text-align: left;
  border: 0;
  background: transparent;
  padding: 6px 10px;
  cursor: pointer;
  color: inherit;
  border-radius: 3px;
  font-size: 12px;
}
.export-item:hover { background: var(--bg-hover); }
</style>
