<template>
  <div class="app">
    <div v-if="project.persistError" class="persist-banner" role="alert">{{ t(project.persistError) }}</div>
    <Toolbar
      v-if="project.project.meta"
      @import-data="onImportData"
      @print="onPrint"
      @export-pdf="onExportPDF"
      @export-image="onExportImage"
      @paper-config="paperConfigVisible = true"
      @print-config="printConfigVisible = true"
      @layout-editor="layoutEditorVisible = true"
      @template-library="templateVisible = true"
      @field-map="fieldMapVisible = true"
      @print-center="printCenterVisible = true"
      @preview="previewVisible = true"
      @ai="openAI"
    />
    <div class="main">
      <ProjectSidebar
        @new="onNew"
        @open="onOpen"
        @save="onSave"
        @save-as="onSaveAs"
        @switch="switchToProject"
      />
      <ComponentPanel class="left" />
      <DesignCanvas class="center" />
      <!-- 属性栏：支持拖拽调宽 / 收起。AI 调整跟属性共用这一栏，避免再挤掉画布。 -->
      <div class="right-panel" :class="{ resizing }" :style="rightPanelStyle">
        <div
          v-show="!panelHidden"
          class="panel-resizer"
          @mousedown="onResizeStart"
          @dblclick="resetPanelWidth"
          title="拖拽调整宽度，双击还原默认"
        ></div>
        <div class="right-header">
          <button
            class="panel-toggle"
            @click="togglePanel"
            :title="panelHidden ? '展开属性栏' : '收起属性栏'"
          >{{ panelHidden ? '⟨' : '⟩' }}</button>
          <template v-if="!panelHidden">
            <button class="right-tab" :class="{ active: !aiDialogVisible }" @click="aiDialogVisible = false">{{ t('属性') }}</button>
            <button class="right-tab" :class="{ active: aiDialogVisible }" @click="aiDialogVisible = true">{{ t('AI 调整') }}</button>
          </template>
          <span v-else class="right-title-v">{{ aiDialogVisible ? t('AI') : t('属性') }}</span>
        </div>
        <div v-show="!panelHidden && !aiDialogVisible" class="right-body">
          <PropertyPanel @field-map="fieldMapVisible = true" />
        </div>
        <AIDialog
          v-show="!panelHidden && aiDialogVisible"
          class="right-body"
          @close="aiDialogVisible = false"
          @open-settings="aiSettingsVisible = true"
          @applied="onAIApplied"
        />
      </div>
    </div>
    <DataPanel class="bottom" @import="onImportData" />

    <PaperConfig v-if="paperConfigVisible" @close="paperConfigVisible = false" />
    <TemplateDialog v-if="templateVisible" @close="templateVisible = false" />
    <FieldMapDialog v-if="fieldMapVisible" @close="fieldMapVisible = false" />
    <PrintCenterDialog
      v-if="printCenterVisible"
      @close="printCenterVisible = false"
      @run-queue="onRunQueue"
      @reprint="onReprint"
    />
    <PrintConfig v-if="printConfigVisible" @close="printConfigVisible = false" />
    <LayoutEditor v-if="layoutEditorVisible" @close="layoutEditorVisible = false" />
    <PreviewDialog ref="previewRef" v-if="previewVisible" :auto-export="pendingExport" @close="previewVisible = false" />
    <AISettingsDialog
      v-if="aiSettingsVisible"
      @close="aiSettingsVisible = false"
    />
    <PreflightCheckDialog
      v-if="preflightVisible && preflightReport"
      :report="preflightReport"
      @close="preflightVisible = false"
      @proceed="preflightProceed"
      @fix="preflightFix"
    />
    <OnboardingGuide v-if="showOnboarding" @close="dismissOnboarding" @import="onOnboardingImport" />

    <div v-if="importPrompt" class="modal-overlay" @click.self="importPrompt = null">
      <div class="modal import-choice">
        <div class="modal-header">
          {{ t('导入新数据') }}
          <button class="btn btn-icon" @click="importPrompt = null">×</button>
        </div>
        <div class="modal-body">
          <p>{{ t('当前 {cur} 条，新文件 {next} 条。', { cur: importPrompt.current, next: importPrompt.next }) }}</p>
          <p class="import-note">{{ t('追加按列名合并。替换会清空当前数据，且不能撤销。') }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="importPrompt = null">{{ t('取消') }}</button>
          <button class="btn import-replace" @click="confirmImport('replace')">{{ t('替换') }}</button>
          <button class="btn btn-primary" @click="confirmImport('append')">{{ t('追加') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from './utils/i18n'
const { t } = useI18n()
import { useProjectStore } from './stores/project'
import { useDataStore } from './stores/data'
import { saveJSON, readJSONFile, pickFile } from './utils/file'
import { parseExcelFile } from './utils/excel'
import { mergeDataAppend, headersFromRows } from './utils/dataMerge'
import { collectBindingTextFixes } from './utils/render'
import Toolbar from './components/Toolbar.vue'
import ProjectSidebar from './components/ProjectSidebar.vue'
import ComponentPanel from './components/ComponentPanel.vue'
import DesignCanvas from './components/DesignCanvas.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import DataPanel from './components/DataPanel.vue'
import PaperConfig from './components/PaperConfig.vue'
import TemplateDialog from './components/TemplateDialog.vue'
import FieldMapDialog from './components/FieldMapDialog.vue'
import PrintCenterDialog from './components/PrintCenterDialog.vue'
import PrintConfig from './components/PrintConfig.vue'
import LayoutEditor from './components/LayoutEditor.vue'
import PreviewDialog from './components/PreviewDialog.vue'
import AIDialog from './components/AIDialog.vue'
import AISettingsDialog from './components/AISettingsDialog.vue'
import PreflightCheckDialog from './components/PreflightCheckDialog.vue'
import OnboardingGuide from './components/OnboardingGuide.vue'
import { runDiagnostics } from './utils/diagnose'

const project = useProjectStore()
const data = useDataStore()

// 启动时从 localStorage 恢复项目列表（自动保存），没有则用默认项目
project.loadFromStorage()

// 数据的唯一来源是当前项目。先灌进数据表，再注册同步，避免空表把项目数据盖掉。
let hydratingData = false

function headersForProject(ds, rows) {
  const stored = Array.isArray(ds?.headers) ? ds.headers.filter(h => h && h !== '__id') : []
  const fromRows = headersFromRows(rows)
  if (!stored.length) return fromRows
  const seen = new Set(stored)
  return [...stored, ...fromRows.filter(h => !seen.has(h))]
}

function applyProjectData(p) {
  hydratingData = true
  try {
    const ds = p?.dataSource
    const rows = Array.isArray(ds?.data) ? ds.data : []
    const headers = headersForProject(ds, rows)
    if (rows.length || headers.length) {
      data.setData({
        headers,
        rows,
        sourcePath: ds?.path || '',
        embedded: true
      })
    } else {
      data.clear()
    }
  } finally {
    hydratingData = false
  }
}

function migrateLegacyData() {
  const LEGACY = 'labelprint_data_v1'
  let raw = null
  try { raw = localStorage.getItem(LEGACY) } catch (e) { return }
  try { localStorage.removeItem(LEGACY) } catch (e) {}
  if (!raw || data.rows.length) return
  try {
    const saved = JSON.parse(raw)
    const rows = Array.isArray(saved.rows) ? saved.rows : []
    const headers = Array.isArray(saved.headers) && saved.headers.length
      ? saved.headers.filter(h => h && h !== '__id')
      : headersFromRows(rows)
    if (!rows.length && !headers.length) return
    data.setData({
      headers,
      rows,
      sourcePath: saved.sourcePath || '',
      embedded: true
    })
    embedCurrentData()
  } catch (e) { /* 旧缓存损坏则丢弃 */ }
}

applyProjectData(project.project)
migrateLegacyData()
project.hydrateFromIdb().then((replaced) => {
  if (replaced) applyProjectData(project.project)
})

const paperConfigVisible = ref(false)
const printConfigVisible = ref(false)
const layoutEditorVisible = ref(false)
const previewVisible = ref(false)
const templateVisible = ref(false)
const fieldMapVisible = ref(false)
const printCenterVisible = ref(false)
const previewRef = ref(null)
const aiDialogVisible = ref(false)
const aiSettingsVisible = ref(false)
// 打印前体检
const preflightVisible = ref(false)
const preflightReport = ref(null)
const importPrompt = ref(null)

// 首屏引导卡：空画布时出现。点「下一步」套用模板后画布不再空，引导仍留到用户关掉或导入。
const onboardingDismissed = ref(localStorage.getItem('labelprint_onboarding_dismissed') === '1')
const onboardingLatched = ref(false)
const canvasEmpty = computed(() => !!project.project?.meta && project.project.components.length === 0)
watch(canvasEmpty, (empty) => {
  if (empty && !onboardingDismissed.value) onboardingLatched.value = true
}, { immediate: true })
const showOnboarding = computed(() =>
  onboardingLatched.value && !onboardingDismissed.value && !!project.project?.meta
)
function dismissOnboarding() {
  onboardingDismissed.value = true
  onboardingLatched.value = false
  localStorage.setItem('labelprint_onboarding_dismissed', '1')
}

function onOnboardingImport() {
  dismissOnboarding()
  onImportData()
}

// 切项目时从目标项目自己的行取列名。不能沿用上一份表的 headers，否则列对不上会被写成空字符串再存回去。
watch(() => project.currentId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  applyProjectData(project.project)
})

// 兜底：data store 任何修改都立即同步嵌入到当前项目
// 关键：flush: 'sync' 让编辑与嵌入同步发生，避免「编辑后立即切项目」时旧数据被保存
watch(() => [data.rows, data.sourcePath], () => {
  embedCurrentData()
}, { deep: true, flush: 'sync' })

// ============ 属性栏宽度 / 收起（localStorage 持久化） ============
const PANEL_W_KEY = 'labelprint_property_panel_width'
const PANEL_HIDDEN_KEY = 'labelprint_property_panel_hidden'
const PANEL_DEFAULT_W = 280
const PANEL_MIN_W = 200
const PANEL_MAX_W = 900

const panelWidth = ref(PANEL_DEFAULT_W)
const panelHidden = ref(false)
const resizing = ref(false)

try {
  const savedW = Number(localStorage.getItem(PANEL_W_KEY))
  if (Number.isFinite(savedW) && savedW >= PANEL_MIN_W && savedW <= PANEL_MAX_W) {
    panelWidth.value = Math.round(savedW)
  }
  panelHidden.value = localStorage.getItem(PANEL_HIDDEN_KEY) === '1'
} catch (e) { /* localStorage 不可用时用默认值 */ }

const rightPanelStyle = computed(() => ({
  width: (panelHidden.value ? 26 : panelWidth.value) + 'px'
}))

function onResizeStart(e) {
  if (e.button !== 0) return
  e.preventDefault()
  resizing.value = true
  const startX = e.clientX
  const startW = panelWidth.value
  const onMove = (ev) => {
    // 属性栏在右侧：向左拖 → 变宽
    const next = startW + (startX - ev.clientX)
    panelWidth.value = Math.round(Math.min(PANEL_MAX_W, Math.max(PANEL_MIN_W, next)))
  }
  const onUp = () => {
    resizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    try { localStorage.setItem(PANEL_W_KEY, String(panelWidth.value)) } catch (e) {}
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function resetPanelWidth() {
  panelWidth.value = PANEL_DEFAULT_W
  try { localStorage.setItem(PANEL_W_KEY, String(PANEL_DEFAULT_W)) } catch (e) {}
}

function togglePanel() {
  panelHidden.value = !panelHidden.value
  try { localStorage.setItem(PANEL_HIDDEN_KEY, panelHidden.value ? '1' : '0') } catch (e) {}
}

function openAI() {
  aiDialogVisible.value = !aiDialogVisible.value
  if (aiDialogVisible.value && panelHidden.value) togglePanel()
}

function sanitizeName(s) {
  // 去掉 Windows/Unix 文件系统非法字符 + 控制字符
  return (s || '').replace(/[\/\\<>:"|?*\x00-\x1f]/g, '_').trim()
}

// 把当前 data store 状态嵌入到当前项目（任何「切走」之前都该做）
// —— 这是「数据跟着项目走」的关键：project.value.dataSource.data 必须包含当前所有数据，
//    否则 persistNow / 切项目后再切回时，老项目会丢数据。
// 策略：完全内联模式（用户建议），不再依赖外置数据文件；每次都同步深拷贝（数据规模 < 千行无感）
function embedCurrentData() {
  if (hydratingData) return
  const ds = project.project?.dataSource
  if (!ds) return
  ds.embedded = true
  ds.path = data.sourcePath || ''
  ds.headers = data.headers.slice()
  ds.data = JSON.parse(JSON.stringify(data.rows))
}

function onNew() {
  // 数据与项目分离：把当前数据快照嵌入旧项目（避免数据丢失），新项目从零开始
  embedCurrentData()
  const name = prompt('新项目名称：', `项目 ${project.projects.length + 1}`)
  if (name === null) return
  project.createProject(sanitizeName(name) || `项目 ${project.projects.length + 1}`)
  // 新项目 → 重新弹出引导卡（纸张/标签配置说不清是打印翻车的主因）
  onboardingDismissed.value = false
  onboardingLatched.value = true
  localStorage.removeItem('labelprint_onboarding_dismissed')
  // data store 在下方 watch(currentId) 中自动清空（保持「数据跟着当前项目走」的一致语义）
}

// 切项目的安全入口：先嵌入再切（防止「切走前数据没保存导致丢」）
function switchToProject(id) {
  if (id === project.currentId) return
  embedCurrentData()
  project.switchProject(id)
}

async function onOpen() {
  if (project.dirty && !confirm('当前项目未保存，确定打开其他项目吗？')) return
  try {
    const file = await pickFile('.json,.lbp,application/json')
    const json = await readJSONFile(file)
    project.setProject(json)
    // 加载数据源（外置或内嵌）
    if (json.dataSource?.embedded && json.dataSource?.data) {
      data.setData({
        headers: headersFromRows(json.dataSource.data),
        rows: json.dataSource.data,
        sourcePath: '',
        embedded: true
      })
    } else if (json.dataSource?.path) {
      // 外置：尝试加载
      try {
        const df = await pickFile('.xlsx,.xls,.csv')
        const parsed = await parseExcelFile(df)
        data.setData({
          headers: parsed.headers,
          rows: parsed.rows,
          sourcePath: json.dataSource.path,
          embedded: false
        })
      } catch (e) {
        alert('数据源未加载：' + e.message + '\n可在数据面板手动导入。')
      }
    }
    project.setFilePath(file.name)
  } catch (e) {
    if (e.message !== '未选择文件') console.error(e)
  }
}

function onSave() {
  // 同步嵌入（防止 data store 里有未持久化到 project.value 的最新编辑）
  embedCurrentData()
  const data2save = project.getExportData()
  if (data.rows.length) {
    data2save.dataSource.embedded = true
    data2save.dataSource.data = JSON.parse(JSON.stringify(data.rows))
  }
  const name = project.project.meta.name || '未命名'
  saveJSON(data2save, `${name}.json`)
  project.dirty = false
}

async function onSaveAs() {
  embedCurrentData()
  const data2save = project.getExportData()
  if (data.rows.length) {
    data2save.dataSource.embedded = true
    data2save.dataSource.data = JSON.parse(JSON.stringify(data.rows))
  }
  const name = sanitizeName(prompt('项目名称', project.project.meta.name || '未命名'))
  if (!name) return
  project.project.meta.name = name
  saveJSON(data2save, `${name}.json`)
  project.dirty = false
}

function onAIApplied(n) {
  // 给一个轻提示：项目被修改但还没保存
  console.log(`[AI] 已应用 ${n} 个组件`)
}
function headersDiffer(a, b) {
  const aa = a || []
  const bb = b || []
  if (aa.length !== bb.length) return true
  const set = new Set(bb)
  return aa.some(h => !set.has(h))
}

function healBoundText() {
  const fixes = collectBindingTextFixes(
    project.project.components,
    data.fields,
    project.project.dataSource.fieldMap
  )
  for (const fix of fixes) {
    project.updateComponent(fix.id, fix.cells ? { cells: fix.cells } : { text: fix.text })
  }
}

function applyImported(mode, payload) {
  const { headers, rows, fileName } = payload
  const prevHeaders = data.headers.slice()
  if (mode === 'replace') {
    data.setData({
      headers,
      rows,
      sourcePath: fileName,
      embedded: true
    })
    // 列变了，旧映射还指着上一份表的列，清空后按新列重新绑
    if (headersDiffer(prevHeaders, headers)) project.updateFieldMap({})
  } else {
    const merged = mergeDataAppend(data.headers, data.rows, headers, rows || [])
    data.setData({
      headers: merged.headers,
      rows: merged.rows,
      sourcePath: fileName,
      embedded: true
    })
  }
  healBoundText()
  embedCurrentData()
  project.markDirty()
}

function confirmImport(mode) {
  const payload = importPrompt.value
  importPrompt.value = null
  if (!payload) return
  applyImported(mode, payload)
}

// 已有数据时用页面里的三个按钮：追加 / 替换 / 取消
async function onImportData() {
  try {
    const file = await pickFile('.xlsx,.xls,.csv')
    const parsed = await parseExcelFile(file)
    const headers = (parsed.headers || []).map(s => String(s || '').replace(/^\uFEFF/, '').trim())
    const rows = parsed.rows || []
    if (!rows.length && !data.rows.length) {
      alert(t('新文件没有数据。'))
      return
    }
    const payload = { headers, rows, fileName: file.name, current: data.rows.length, next: rows.length }
    if (data.rows.length > 0) {
      importPrompt.value = payload
      return
    }
    applyImported('replace', payload)
  } catch (e) {
    if (e.message !== '未选择文件') alert(t('导入失败：{msg}', { msg: e.message }))
  }
}

// 打印通过预览组件触发，这里只打开预览
const pendingExport = ref('') // 待执行的导出动作：'' | 'pdf' | 'image'

// ============ 打印 / 导出：先体检，有问题才打扰 ============
// kind: '' = 打印 | 'pdf' = 导出 PDF | 'image' = 导出图片
let pendingKind = ''

function buildPreflightReport() {
  const p = project.project
  return runDiagnostics({
    components: p.components,
    dataFields: data.fields,
    fieldMap: p.dataSource?.fieldMap || {},
    rowCount: data.rows.length,
    rows: data.displayRows,
    label: p.label,
    paper: p.paper,
    perPage: project.labelsPerPage,
    printConfig: p.printConfig
  })
}

function requestExport(kind = '') {
  const report = buildPreflightReport()
  // 一切正常 → 不打扰，直接进预览
  if (!report.issues.length) {
    pendingExport.value = kind
    previewVisible.value = true
    return
  }
  pendingKind = kind
  preflightReport.value = report
  preflightVisible.value = true
}

// 体检后可继续（无阻塞项，或用户坚持）
function preflightProceed() {
  preflightVisible.value = false
  pendingExport.value = pendingKind
  previewVisible.value = true
}

// 从体检结果跳到对应修复入口
function preflightFix(issue) {
  preflightVisible.value = false
  if (issue.fix === 'field-map') {
    fieldMapVisible.value = true
  } else if (issue.fix === 'import') {
    onImportData()
  } else if (issue.fix === 'select' && issue.ids?.length) {
    project.selectOne(issue.ids[0])
  }
}

function onPrint() { requestExport('') }
function onExportPDF() { requestExport('pdf') }
function onExportImage() { requestExport('image') }

// 打印中心：执行当前项目队列（需要预览 DOM，自动打开预览）
async function onRunQueue() {
  printCenterVisible.value = false
  if (!previewVisible.value) previewVisible.value = true
  await nextTick()
  await new Promise(r => setTimeout(r, 800)) // 等页面渲染 + 二维码生成
  previewRef.value?.runQueue()
}

// 历史「重打」：切换到对应项目并打开预览
async function onReprint(entry) {
  printCenterVisible.value = false
  if (entry.projectId && entry.projectId !== project.currentId) {
    switchToProject(entry.projectId)
    await nextTick()
  }
  pendingExport.value = ''
  previewVisible.value = true
}

// ============ 全局快捷键：撤销 / 重做 / 全选 / Esc 取消选择 ============
function onGlobalKey(e) {
  // Esc 取消选择（不要求修饰键，输入框内 Esc 仍能取消）
  const tag = (e.target.tagName || '').toLowerCase()
  const inEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable
  if (e.key === 'Escape') {
    // 输入框内 Esc 让浏览器自己处理（退出编辑）
    if (!inEditable && project.selectedIds.length) {
      e.preventDefault()
      project.clearSelection()
    }
    return
  }

  const mod = e.ctrlKey || e.metaKey
  if (!mod) return
  // 全选 Ctrl+A：仅在非输入框时（避免拦截文本选择）
  if (e.key.toLowerCase() === 'a' && !inEditable) {
    e.preventDefault()
    project.selectAll()
    return
  }

  const k = e.key.toLowerCase()
  // 输入框里的撤销/重做/复制交给浏览器，不要改画布
  if (inEditable && (k === 'z' || k === 'y' || k === 'd')) return
  if (k === 'z' && !e.shiftKey) {
    e.preventDefault()
    project.undo()
  } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
    e.preventDefault()
    project.redo()
  } else if (k === 'd' && e.shiftKey) {
    // Ctrl+Shift+D 取消选择（设计软件常见）
    e.preventDefault()
    project.clearSelection()
  } else if (k === 'd' && !e.shiftKey) {
    // Ctrl+D 复制选中的组件（多选时复制多个）
    if (project.selectedIds.length) {
      e.preventDefault()
      project.duplicateSelected()
    }
  }
}
window.addEventListener('keydown', onGlobalKey)
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.persist-banner {
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 13px;
  background: var(--bg-panel);
  color: var(--text);
  border-bottom: 2px solid var(--warning);
}
.main {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.left {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  overflow: auto;
}

/* ---- 右侧属性栏 ---- */
.right-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  transition: width 0.12s ease;
}
/* 拖拽过程中禁用过渡与文本选择，避免跟手迟滞 */
.right-panel.resizing {
  transition: none;
  user-select: none;
  cursor: col-resize;
}
.panel-resizer {
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 20;
}
.panel-resizer:hover,
.right-panel.resizing .panel-resizer {
  background: var(--primary);
  opacity: 0.45;
}
.right-header {
  flex-shrink: 0;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
}
.panel-toggle {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1;
}
.panel-toggle:hover {
  background: var(--bg-hover);
  color: var(--primary);
}
.right-tab {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}
.right-tab.active {
  color: var(--primary);
  background: rgba(37, 99, 235, 0.12);
}
.right-title-v {
  writing-mode: vertical-rl;
  font-weight: 600;
  letter-spacing: 2px;
}
.right-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.center {
  flex: 1;
  background: var(--bg);
  overflow: auto;
}
.bottom {
  height: 220px;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
}
.import-choice { width: min(440px, 92vw); }
.import-choice p { margin: 0 0 8px; line-height: 1.5; }
.import-note { color: var(--text-secondary); font-size: 13px; }
.import-replace { color: var(--danger); border-color: var(--danger); }
</style>
