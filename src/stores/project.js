import { defineStore } from 'pinia'
import { ref, computed, toRaw, watch } from 'vue'
import { getUserDefaults, saveUserDefaults } from './userDefaults'

// 纸张预设（打印介质：决定打印机走纸的纸张）
export const PAPER_PRESETS = [
  { name: 'A4 (210×297)', width: 210, height: 297 },
  { name: 'A5 (148×210)', width: 148, height: 210 },
  { name: 'A6 (105×148)', width: 105, height: 148 },
  { name: 'Letter (216×279)', width: 215.9, height: 279.4 },
  { name: '单张小标签 100×50', width: 100, height: 50 },
  { name: '单张小标签 80×50', width: 80, height: 50 },
  { name: '单张小标签 50×30', width: 50, height: 30 },
  { name: '单张方形 100×100', width: 100, height: 100 }
]

// 标签尺寸预设（数据单元：每条数据占一个标签）
export const LABEL_PRESETS = [
  { name: '40×30 mm 小标签', width: 40, height: 30 },
  { name: '50×30 mm 条码标签', width: 50, height: 30 },
  { name: '60×40 mm 价格标签', width: 60, height: 40 },
  { name: '80×50 mm 商品标签', width: 80, height: 50 },
  { name: '100×50 mm 横版标签', width: 100, height: 50 },
  { name: '100×70 mm 中标签', width: 100, height: 70 },
  { name: '100×100 mm 方形标签', width: 100, height: 100 },
  { name: '100×150 mm 面单', width: 100, height: 150 }
]

const createDefaultProject = () => {
  // 跨项目偏好：新建时继承用户上次的选择（"我经常用 80×60 标签"）
  const ud = getUserDefaults()
  return {
  meta: {
    name: '未命名项目',
    version: '0.2.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    remarks: ''
  },
  // 纸张 = 物理打印介质（决定打印机走纸大小）
  paper: { ...ud.paper },
  // 标签 = 数据单元（一条数据对应一个标签）
  // 组件位置是相对标签左上角的
  label: {
    ...ud.label,
    // 标签边框（打印/预览时每个标签的可见边框）
    showBorder: ud.label.showBorder ?? false,
    borderColor: '#000000',
    borderWidth: 0.3  // mm
  },
  // 纸张边距（标签区到纸边的距离）
  margin: {
    top: 3, right: 3, bottom: 3, left: 3
  },
  // 排版：single=一张一个标签 / auto=自动按标签尺寸排版
  layout: { ...ud.layout },
  components: [],
  dataSource: {
    path: '',
    embedded: false,
    data: [],
    // 字段映射：{ 模板字段: 数据源字段 }，用于模板字段名与数据列名不一致的情况
    fieldMap: {}
  },
  printConfig: {
    copies: 1,
    range: 'all',
    rangeStart: 1,
    rangeEnd: 1,
    printer: '',
    format: 'print'
  }
  }
}

export const useProjectStore = defineStore('project', () => {
  const project = ref(createDefaultProject())
  const filePath = ref('')
  const dirty = ref(false)
  const selectedId = ref(null)        // 主选（最后点击的），用于 PropertyPanel 单选模式
  const selectedIds = ref([])          // 多选集合；1 个时 = [selectedId]
  const zoom = ref(1)
  const showGrid = ref(true)
  // 视图自动适配：开启后窗口 resize 自动重新"适合窗口"；用户手动缩放会关闭
  const autoFit = ref(false)
  // 左侧组件单击添加：DesignCanvas 监听后放到标签中心
  const addRequest = ref(0)
  const addRequestType = ref('')

  const selectedComponent = computed(() =>
    project.value.components.find(c => c.id === selectedId.value)
  )
  // 多选模式：≥2 个选中时显示对齐/等距工具栏
  const isMultiSelect = computed(() => selectedIds.value.length > 1)

  // 同步主选 = 选中列表最后一个；空则 null
  function _syncSelectedId() {
    if (!selectedIds.value.length) {
      selectedId.value = null
    } else {
      selectedId.value = selectedIds.value[selectedIds.value.length - 1]
    }
  }

  // 选择 API：单选 / 加选 / 范围选 / 全选
  function selectOne(id) {
    if (id == null) { selectedIds.value = []; selectedId.value = null; return }
    selectedIds.value = [id]
    selectedId.value = id
  }
  // toggle：已在列表则移除，否则加入
  function selectToggle(id) {
    if (id == null) return
    const i = selectedIds.value.indexOf(id)
    if (i >= 0) {
      selectedIds.value = selectedIds.value.filter(x => x !== id)
    } else {
      selectedIds.value = [...selectedIds.value, id]
    }
    _syncSelectedId()
  }
  // 范围选：从当前主选到 id（在 project.components 数组中按位置选区段）
  function selectRange(id) {
    if (id == null || selectedId.value == null) { selectOne(id); return }
    const arr = project.value.components
    const a = arr.findIndex(c => c.id === selectedId.value)
    const b = arr.findIndex(c => c.id === id)
    if (a < 0 || b < 0) { selectOne(id); return }
    const [lo, hi] = a <= b ? [a, b] : [b, a]
    const ids = arr.slice(lo, hi + 1).map(c => c.id)
    // 合并（不丢已有选中）
    const set = new Set([...selectedIds.value, ...ids])
    selectedIds.value = arr.filter(c => set.has(c.id)).map(c => c.id)
    _syncSelectedId()
  }
  function selectAll() {
    selectedIds.value = project.value.components.map(c => c.id)
    _syncSelectedId()
  }
  function clearSelection() {
    selectedIds.value = []
    selectedId.value = null
  }
  // 删除选中（多选时批量）
  function removeSelected() {
    if (!selectedIds.value.length) return
    const set = new Set(selectedIds.value)
    project.value.components = project.value.components.filter(c => !set.has(c.id))
    selectedIds.value = []
    selectedId.value = null
    markDirty()
  }

  // 复制选中的所有组件：偏移 +2mm，新 id 全部追加到 selectedIds（保持选中）
  function duplicateSelected() {
    if (!selectedIds.value.length) return
    const set = new Set(selectedIds.value)
    const toDup = project.value.components.filter(c => set.has(c.id))
    const newIds = []
    for (const c of toDup) {
      const copy = JSON.parse(JSON.stringify(c))
      copy.id = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
      copy.left = (copy.left || 0) + 2
      copy.top = (copy.top || 0) + 2
      project.value.components.push(copy)
      newIds.push(copy.id)
    }
    selectedIds.value = newIds
    selectedId.value = newIds[newIds.length - 1] || null
    markDirty()
  }

  // 置顶选中：把 selectedIds 对应组件的 order 改成最大 +1
  // 简单实现：按 components 数组顺序就是 z-order，把选中项移到末尾
  function bringToFront() {
    if (!selectedIds.value.length) return
    const set = new Set(selectedIds.value)
    const arr = project.value.components
    const picked = arr.filter(c => set.has(c.id))
    const rest = arr.filter(c => !set.has(c.id))
    project.value.components = [...rest, ...picked]
    markDirty()
  }
  // 置底选中：移到开头
  function sendToBack() {
    if (!selectedIds.value.length) return
    const set = new Set(selectedIds.value)
    const arr = project.value.components
    const picked = arr.filter(c => set.has(c.id))
    const rest = arr.filter(c => !set.has(c.id))
    project.value.components = [...picked, ...rest]
    markDirty()
  }

  function setProject(p) {
    // 合并默认值，防止字段缺失
    const def = createDefaultProject()
    const merged = JSON.parse(JSON.stringify({ ...def, ...p }))
    // label 深合并：旧项目补齐新增的边框/背景字段
    merged.label = { ...def.label, ...(p.label || {}) }
    if (!p.dataSource) merged.dataSource = def.dataSource
    // dataSource 深合并：旧项目补齐 fieldMap
    else merged.dataSource = { ...def.dataSource, ...p.dataSource, fieldMap: p.dataSource.fieldMap || {} }
    if (!p.printConfig) merged.printConfig = def.printConfig
    if (!p.layout) merged.layout = { ...def.layout }
    if (!p.margin) merged.margin = { ...def.margin }
    if (!p.paper) merged.paper = { ...def.paper }
    // 兼容老项目：老项目 paper.width/height 其实是标签尺寸
    // 注意 version 在 meta 里；顶层 version 仅存在于更老的文件格式
    const ver = p.meta?.version ?? p.version
    if (ver === undefined || ver === '0.1.0') {
      // 旧的"标签纸"尺寸 → 转成 label（仅当 label 仍是默认值未自定义时）
      if (p.paper && p.paper.width < 200 && (!p.label || p.label.width === 60)) {
        merged.label = { ...def.label, width: p.paper.width, height: p.paper.height }
        merged.paper = { ...def.paper } // 默认 A4 规格的纸
      }
    }
    project.value = merged
    // 重新计算 cols/rows
    if (project.value.layout.sizingMode === 'auto') {
      const lr = calcGrid(project.value)
      project.value.layout.cols = lr.cols
      project.value.layout.rows = lr.rows
    }
    filePath.value = ''
    dirty.value = false
    selectedId.value = null
    selectedIds.value = []
    // 载入新项目 → 历史从头开始
    if (typeof initHistory === 'function') initHistory()
  }

  function setFilePath(p) {
    filePath.value = p
  }

  function markDirty() {
    dirty.value = true
    project.value.meta.updatedAt = new Date().toISOString()
  }

  function requestAddComponent(type) {
    if (!type) return
    addRequestType.value = type
    addRequest.value += 1
  }

  function addComponent(comp) {
    project.value.components.push(comp)
    // 单选模式：新加组件直接选中
    selectedIds.value = [comp.id]
    selectedId.value = comp.id
    markDirty()
  }

  function updateComponent(id, patch) {
    const idx = project.value.components.findIndex(c => c.id === id)
    if (idx >= 0) {
      project.value.components[idx] = {
        ...project.value.components[idx],
        ...patch
      }
      markDirty()
    }
  }

  // 图层顺序：移动组件到指定索引（数组越靠后 = 层叠越靠上）
  function reorderComponent(id, toIndex) {
    const from = project.value.components.findIndex(c => c.id === id)
    if (from < 0) return
    const clamped = Math.max(0, Math.min(project.value.components.length - 1, toIndex))
    if (from === clamped) return
    const [item] = project.value.components.splice(from, 1)
    project.value.components.splice(clamped, 0, item)
    markDirty()
  }
  function bringForward(id) {
    const idx = project.value.components.findIndex(c => c.id === id)
    if (idx >= 0 && idx < project.value.components.length - 1) reorderComponent(id, idx + 1)
  }
  function sendBackward(id) {
    const idx = project.value.components.findIndex(c => c.id === id)
    if (idx > 0) reorderComponent(id, idx - 1)
  }

  function removeComponent(id) {
    project.value.components = project.value.components.filter(c => c.id !== id)
    // 同步从 selectedIds 移除
    if (selectedId.value === id) selectedId.value = null
    selectedIds.value = selectedIds.value.filter(x => x !== id)
    markDirty()
  }

  function moveComponent(id, dx, dy) {
    const c = project.value.components.find(c => c.id === id)
    if (c) {
      c.left += dx
      c.top += dy
      markDirty()
    }
  }

  // ============ 排版工具：对齐 / 等距 ============
  // 选中 ≥ 2 个才能对齐；3+ 才能等距
  // 对齐基准：按第一个选中（或边界框最小/最大）—— 设计软件常见做法
  // 这里实现：按"组边界框"（所有选中的并集）— 简单直观
  function _getSelectedBounds() {
    const ids = new Set(selectedIds.value)
    const cs = project.value.components.filter(c => ids.has(c.id))
    if (!cs.length) return null
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
    for (const c of cs) {
      const l = c.left, t = c.top, r = c.left + (c.width || 0), b = c.top + (c.height || 0)
      if (l < left) left = l
      if (t < top) top = t
      if (r > right) right = r
      if (b > bottom) bottom = b
    }
    return { left, top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2, w: right - left, h: bottom - top }
  }
  // direction: 'left' | 'right' | 'top' | 'bottom' | 'hcenter' | 'vcenter'
  function alignSelected(direction) {
    if (selectedIds.value.length < 2) return
    const b = _getSelectedBounds()
    if (!b) return
    const ids = new Set(selectedIds.value)
    for (const c of project.value.components) {
      if (!ids.has(c.id)) continue
      if (direction === 'left') c.left = b.left
      else if (direction === 'right') c.left = b.right - (c.width || 0)
      else if (direction === 'hcenter') c.left = b.centerX - (c.width || 0) / 2
      else if (direction === 'top') c.top = b.top
      else if (direction === 'bottom') c.top = b.bottom - (c.height || 0)
      else if (direction === 'vcenter') c.top = b.centerY - (c.height || 0) / 2
    }
    markDirty()
  }
  // axis: 'h' 水平等距（按 left 等距分布）| 'v' 垂直等距
  // 选最左/最右两个定总跨度，剩余按 (right - left) / (n - 1) 等距
  function distributeSelected(axis) {
    const ids = new Set(selectedIds.value)
    const cs = project.value.components.filter(c => ids.has(c.id))
    if (cs.length < 3) return
    const sorted = [...cs].sort(axis === 'h'
      ? (a, b) => a.left - b.left
      : (a, b) => a.top - b.top)
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const start = axis === 'h' ? first.left : first.top
    const end = axis === 'h' ? last.left : last.top
    const total = end - start
    const step = total / (sorted.length - 1)
    // 第一个和最后一个位置不动，中间按等距
    for (let i = 1; i < sorted.length - 1; i++) {
      const c = sorted[i]
      if (axis === 'h') c.left = start + step * i
      else c.top = start + step * i
    }
    markDirty()
  }

  // ============ 核心几何计算 ============
  // 标签区在画布上的左上角（mm）
  const labelAreaOrigin = computed(() => ({
    x: project.value.margin.left,
    y: project.value.margin.top
  }))

  // 标签区尺寸（mm）
  const labelAreaSize = computed(() => ({
    width: project.value.paper.width - project.value.margin.left - project.value.margin.right,
    height: project.value.paper.height - project.value.margin.top - project.value.margin.bottom
  }))

  // 按标签尺寸算每页能排多少
  function calcGrid(p = project.value) {
    const aw = p.paper.width - p.margin.left - p.margin.right
    const ah = p.paper.height - p.margin.top - p.margin.bottom
    const lw = Math.max(1, p.label.width)
    const lh = Math.max(1, p.label.height)
    const hGap = Math.max(0, p.layout.hGap || 0)
    const vGap = Math.max(0, p.layout.vGap || 0)
    const cols = Math.max(1, Math.floor((aw + hGap) / (lw + hGap)))
    const rows = Math.max(1, Math.floor((ah + vGap) / (lh + vGap)))
    return { cols, rows }
  }

  // 每页标签数
  const labelsPerPage = computed(() => {
    if (project.value.layout.mode === 'auto') {
      return (project.value.layout.cols || 1) * (project.value.layout.rows || 1)
    }
    return 1
  })

  // 第 idx 个标签在画布上的位置和尺寸（mm）; idx 是 0 开始的页内序号
  // 返回 { x, y, width, height, cols, rows, col, row }
  function getLabelRect(idx) {
    const L = project.value.layout
    const lw = project.value.label.width
    const lh = project.value.label.height
    const ox = labelAreaOrigin.value.x
    const oy = labelAreaOrigin.value.y
    if (L.mode === 'single' || (L.cols <= 1 && L.rows <= 1)) {
      return { x: ox, y: oy, width: lw, height: lh, cols: 1, rows: 1, col: 0, row: 0 }
    }
    const cols = L.cols
    const rows = L.rows
    const col = idx % cols
    const row = Math.floor(idx / cols)
    return {
      x: ox + col * (lw + (L.hGap || 0)),
      y: oy + row * (lh + (L.vGap || 0)),
      width: lw, height: lh,
      cols, rows, col, row
    }
  }

  // 在画布坐标 (mm) 上找到所属标签索引；若不在任何标签内，返回最近的一个
  function findLabelAt(x, y) {
    const L = project.value.layout
    if (L.mode === 'single' || (L.cols <= 1 && L.rows <= 1)) return 0
    const ox = labelAreaOrigin.value.x
    const oy = labelAreaOrigin.value.y
    const lw = project.value.label.width
    const lh = project.value.label.height
    const hGap = L.hGap || 0
    const vGap = L.vGap || 0
    if (x < ox || y < oy) return 0
    const col = Math.max(0, Math.min(L.cols - 1, Math.floor((x - ox) / (lw + hGap))))
    const row = Math.max(0, Math.min(L.rows - 1, Math.floor((y - oy) / (lh + vGap))))
    return row * L.cols + col
  }

  // 标签尺寸变化 → 重新算 cols/rows
  function updateLabel(patch) {
    project.value.label = { ...project.value.label, ...patch }
    if (project.value.layout.sizingMode === 'auto') {
      const lr = calcGrid()
      project.value.layout.cols = lr.cols
      project.value.layout.rows = lr.rows
    }
    saveUserDefaults({ label: project.value.label })
    markDirty()
  }

  // 切换排版尺寸模式
  function setSizingMode(mode) {
    if (project.value.layout.sizingMode === mode) return
    if (mode === 'auto') {
      // 从 manual 切到 auto：按当前 cols/rows 推回标签尺寸（取第 0 个标签的大小）
      const L = project.value.layout
      const aw = project.value.paper.width - project.value.margin.left - project.value.margin.right
      const ah = project.value.paper.height - project.value.margin.top - project.value.margin.bottom
      const cols = Math.max(1, L.cols)
      const rows = Math.max(1, L.rows)
      project.value.label = {
        ...project.value.label,
        width: Math.max(1, (aw - (cols - 1) * (L.hGap || 0)) / cols),
        height: Math.max(1, (ah - (rows - 1) * (L.vGap || 0)) / rows)
      }
      const lr = calcGrid()
      project.value.layout.cols = lr.cols
      project.value.layout.rows = lr.rows
    }
    // manual → 不动 label，按当前 cols/rows
    project.value.layout.sizingMode = mode
    markDirty()
  }

  // 纸张尺寸变化时也重算
  function updatePaper(patch) {
    project.value.paper = { ...project.value.paper, ...patch }
    if (project.value.layout.sizingMode === 'auto') {
      const lr = calcGrid()
      project.value.layout.cols = lr.cols
      project.value.layout.rows = lr.rows
    }
    saveUserDefaults({ paper: project.value.paper })
    markDirty()
  }

  function updateMargin(patch) {
    project.value.margin = { ...project.value.margin, ...patch }
    if (project.value.layout.sizingMode === 'auto') {
      const lr = calcGrid()
      project.value.layout.cols = lr.cols
      project.value.layout.rows = lr.rows
    }
    markDirty()
  }

  function updateLayout(patch) {
    const prevSizing = project.value.layout.sizingMode
    // auto 模式下用户改 cols/rows = 想固定网格 → 自动切 manual（避免被 auto 重置回 1×1）
    const userTouchedGrid = (patch.cols != null || patch.rows != null) && prevSizing === 'auto'
    project.value.layout = { ...project.value.layout, ...patch }
    if (patch.sizingMode && patch.sizingMode !== prevSizing) {
      setSizingMode(patch.sizingMode)
    } else if (userTouchedGrid) {
      project.value.layout.sizingMode = 'manual'
    }
    // auto 模式重算 cols/rows
    if (project.value.layout.sizingMode === 'auto') {
      const lr = calcGrid()
      project.value.layout.cols = lr.cols
      project.value.layout.rows = lr.rows
    }
    saveUserDefaults({ layout: project.value.layout })
    markDirty()
  }

  // ============ 字段映射 / 模板 ============
  function updateFieldMap(map) {
    project.value.dataSource.fieldMap = { ...(map || {}) }
    markDirty()
  }

  // 应用模板：只替换版式相关部分，保留当前数据源、字段映射与打印配置
  function applyTemplate(tpl) {
    if (!tpl) return
    const def = createDefaultProject()
    const cur = project.value
    project.value = {
      meta: { ...cur.meta, updatedAt: new Date().toISOString() },
      paper: { ...def.paper, ...(tpl.paper || {}) },
      label: { ...def.label, ...(tpl.label || {}) },
      margin: { ...def.margin, ...(tpl.margin || {}) },
      layout: { ...def.layout, ...(tpl.layout || {}) },
      components: JSON.parse(JSON.stringify(tpl.components || [])),
      dataSource: { ...cur.dataSource, fieldMap: { ...(cur.dataSource?.fieldMap || {}) } },
      printConfig: { ...cur.printConfig }
    }
    if (project.value.layout.sizingMode === 'auto') {
      const lr = calcGrid()
      project.value.layout.cols = lr.cols
      project.value.layout.rows = lr.rows
    }
    selectedId.value = null
    selectedIds.value = []
    markDirty()
    schedulePersist()
  }

  function getExportData() {
    return JSON.parse(JSON.stringify(toRaw(project.value)))
  }

  // ============ 多项目 + 自动保存（localStorage） ============
  const STORAGE_KEY = 'labelprint_projects_v1'
  const projects = ref([])        // [{ id, name, updatedAt, data }]
  const currentId = ref(null)
  const persistError = ref('')   // 配额满等保存失败，给界面一条提示
  let saveTimer = null
  let restoring = false           // 恢复/切换/批量操作过程中暂停自动保存和历史

  function genProjId() { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

  function persistNow() {
    if (restoring || !currentId.value) return
    const idx = projects.value.findIndex(p => p.id === currentId.value)
    if (idx < 0) return
    projects.value[idx] = {
      ...projects.value[idx],
      name: project.value.meta.name || projects.value[idx].name,
      updatedAt: Date.now(),
      data: getExportData()
    }
    try {
      // v2 格式：列表顺序 + 当前项目分开存，保证顺序稳定、刷新回到原项目
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: 2,
        currentId: currentId.value,
        list: toRaw(projects.value)
      }))
      persistError.value = ''
    } catch (e) {
      console.warn('自动保存失败（可能超出存储配额）:', e)
      persistError.value = '自动保存失败：浏览器存储已满。请先下载项目文件备份，或删除不用的项目。'
    }
  }

  function schedulePersist() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(persistNow, 600)
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // 兼容 v1（纯数组）与 v2（{ list, currentId }）
        const list = Array.isArray(parsed) ? parsed : parsed?.list
        if (Array.isArray(list) && list.length) {
          projects.value = list
          const remembered = Array.isArray(parsed) ? null : parsed.currentId
          const cur = list.find(p => p.id === remembered) || list[0]
          currentId.value = cur.id
          setProject(cur.data)
          return true
        }
      }
    } catch (e) { /* 损坏则重建 */ }
    // 首次使用：创建默认项目
    const p = { id: genProjId(), name: '未命名项目', updatedAt: Date.now(), data: getExportData() }
    projects.value = [p]
    currentId.value = p.id
    persistNow()
    return false
  }

  // 版式/选中变化入历史。数据行不进快照：单元格编辑不再整表序列化，撤销也不改数据表。
  watch([project, selectedIds], () => { schedulePersist(); pushHistory() }, { deep: true, flush: 'sync' })

  // ============ 撤销 / 重做 ============
  const HISTORY_LIMIT = 60
  const undoStack = ref([])
  const redoStack = ref([])
  let lastSnapshot = null
  let lastFingerprint = ''

  function historyProject() {
    const raw = toRaw(project.value)
    const ds = raw.dataSource || {}
    const { data: _rows, headers: _headers, ...dsRest } = ds
    return JSON.parse(JSON.stringify({
      ...raw,
      dataSource: { ...dsRest, data: [] }
    }))
  }

  function fingerprint() {
    const p = project.value
    const ds = p.dataSource || {}
    return JSON.stringify({
      meta: p.meta,
      paper: p.paper,
      label: p.label,
      margin: p.margin,
      layout: p.layout,
      components: p.components,
      fieldMap: ds.fieldMap,
      printConfig: p.printConfig,
      selectedId: selectedId.value,
      selectedIds: selectedIds.value
    })
  }

  function snapNow() {
    return {
      project: historyProject(),
      selectedId: selectedId.value,
      selectedIds: [...selectedIds.value]
    }
  }

  function pushHistory() {
    if (restoring) return
    const fp = fingerprint()
    if (fp === lastFingerprint) return
    const snap = snapNow()
    if (lastSnapshot) {
      undoStack.value.push(lastSnapshot)
      if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift()
      redoStack.value = []
    }
    lastSnapshot = snap
    lastFingerprint = fp
  }

  // 数据列重命名会改组件文字，但不进撤销栈（数据行本身也不进栈）
  function absorbHistory(fn) {
    restoring = true
    try {
      fn()
    } finally {
      restoring = false
    }
    lastSnapshot = snapNow()
    lastFingerprint = fingerprint()
    schedulePersist()
  }

  // 一次撤销覆盖整批改动（AI 套用版式等）
  function batchUpdate(fn) {
    restoring = true
    try {
      fn()
    } finally {
      restoring = false
    }
    markDirty()
    pushHistory()
    schedulePersist()
  }

  function restoreSnapshot(snap) {
    const liveRows = Array.isArray(project.value.dataSource?.data)
      ? JSON.parse(JSON.stringify(project.value.dataSource.data))
      : []
    const liveHeaders = Array.isArray(project.value.dataSource?.headers)
      ? project.value.dataSource.headers.slice()
      : null
    restoring = true
    const restored = JSON.parse(JSON.stringify(snap.project))
    if (!restored.dataSource) restored.dataSource = {}
    restored.dataSource.data = liveRows
    if (liveHeaders) restored.dataSource.headers = liveHeaders
    project.value = restored
    if (project.value.layout.sizingMode === 'auto') {
      const lr = calcGrid()
      project.value.layout.cols = lr.cols
      project.value.layout.rows = lr.rows
    }
    const validIds = Array.isArray(snap.selectedIds) ? snap.selectedIds.filter(id => project.value.components.some(c => c.id === id)) : []
    if (validIds.length > 1) {
      selectedIds.value = validIds
      selectedId.value = validIds[validIds.length - 1]
    } else if (validIds.length === 1) {
      selectedIds.value = [validIds[0]]
      selectedId.value = validIds[0]
    } else {
      selectedId.value = snap.selectedId && project.value.components.some(c => c.id === snap.selectedId)
        ? snap.selectedId
        : null
      selectedIds.value = selectedId.value ? [selectedId.value] : []
    }
    lastSnapshot = snapNow()
    lastFingerprint = fingerprint()
    dirty.value = true
    restoring = false
    persistNow()
  }

  function undo() {
    if (!undoStack.value.length) return false
    const snap = undoStack.value.pop()
    if (lastSnapshot) redoStack.value.push(lastSnapshot)
    restoreSnapshot(snap)
    return true
  }

  function redo() {
    if (!redoStack.value.length) return false
    const snap = redoStack.value.pop()
    if (lastSnapshot) undoStack.value.push(lastSnapshot)
    restoreSnapshot(snap)
    return true
  }

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  // 重置历史（载入新项目 / 手动清空）
  function initHistory() {
    undoStack.value = []
    redoStack.value = []
    lastSnapshot = snapNow()
    lastFingerprint = fingerprint()
  }
  const clearHistory = initHistory

  // store 初始化时建立基线快照（保证第一次修改也能撤销）
  initHistory()

  function createProject(name = '未命名项目') {
    persistNow()
    const fresh = createDefaultProject()
    fresh.meta.name = name
    const p = { id: genProjId(), name, updatedAt: Date.now(), data: fresh }
    projects.value.unshift(p)
    currentId.value = p.id
    setProject(fresh)
    persistNow()
    return p.id
  }

  function switchProject(id) {
    if (id === currentId.value) return
    // 切项目前：把当前 data store 的数据嵌入到当前项目（避免切走时丢数据）
    // data store 状态由 App.vue 维护，这里只读 project.value.dataSource 并补全
    // 注：data store 是另一份独立状态，需 App.vue 在 switchProject 之前同步嵌入（见 App.vue switchToProject）
    persistNow()  // 保存当前
    const target = projects.value.find(p => p.id === id)
    if (!target) return
    restoring = true
    currentId.value = id
    setProject(JSON.parse(JSON.stringify(target.data)))
    // 注意：不调整列表顺序，保证项目列表位置稳定（点击不变位）
    restoring = false
    persistNow()
  }

  function deleteProject(id) {
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx < 0) return
    projects.value.splice(idx, 1)
    if (id === currentId.value) {
      if (projects.value.length) {
        switchProject(projects.value[0].id)
      } else {
        createProject()
      }
    } else {
      persistNow()
    }
  }

  function renameCurrentProject(name) {
    project.value.meta.name = name
    const idx = projects.value.findIndex(p => p.id === currentId.value)
    if (idx >= 0) projects.value[idx].name = name
    markDirty()
    schedulePersist()
  }

  // 通用重命名（任意项目，含非当前项目）
  function renameProject(id, name) {
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx < 0) return
    projects.value[idx].name = name
    if (projects.value[idx].data?.meta) projects.value[idx].data.meta.name = name
    if (id === currentId.value) {
      project.value.meta.name = name
      markDirty()
    }
    persistNow()
  }

  function newProject() {
    // 新建项目并加入列表（保留多项目切换能力）
    createProject('未命名项目')
    filePath.value = ''
    selectedId.value = null
  }

  return {
    project, filePath, dirty, selectedId, selectedIds, zoom, showGrid, autoFit,
    addRequest, addRequestType, requestAddComponent,
    selectedComponent, isMultiSelect,
    labelAreaOrigin, labelAreaSize, labelsPerPage,
    projects, currentId, persistError,
    newProject, setProject, setFilePath, markDirty,
    addComponent, updateComponent, removeComponent, moveComponent,
    batchUpdate, absorbHistory,
    reorderComponent, bringForward, sendBackward,
    selectOne, selectToggle, selectRange, selectAll, clearSelection, removeSelected,
    duplicateSelected, bringToFront, sendToBack,
    alignSelected, distributeSelected,
    calcGrid, getLabelRect, findLabelAt,
    updateLabel, updatePaper, updateMargin, updateLayout, setSizingMode,
    updateFieldMap, applyTemplate,
    undo, redo, canUndo, canRedo, clearHistory,
    getExportData,
    loadFromStorage, createProject, switchProject, deleteProject, renameCurrentProject, renameProject
  }
})
