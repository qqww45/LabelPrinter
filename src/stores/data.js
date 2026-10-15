import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { dedupFieldNames } from '../utils/excel'
import { useProjectStore } from './project'

const DATA_KEY = 'labelprint_data_v1'
let dataSaveTimer = null
// 每行唯一 id（用于 v-for :key + 精确按 id 定位行；避免 indexOf 在重复值行时错位）
let _rowSeq = 0
function makeRowId() {
  return 'r' + Date.now().toString(36) + (++_rowSeq).toString(36) + Math.random().toString(36).slice(2, 6)
}

export const useDataStore = defineStore('data', () => {
  const headers = ref([])        // 字段名数组
  const rows = ref([])           // 数据行 [{字段:值}, ...]
  const activeRowIndex = ref(0)  // 当前预览使用的数据行
  const filter = ref('')
  const sourcePath = ref('')     // 数据源路径
  const embedded = ref(false)    // 是否内嵌快照
  // 排序：列名 + 方向（'asc' | 'desc' | ''）。UI 用，不影响源 rows
  const sortKey = ref('')
  const sortDir = ref('')        // '' | 'asc' | 'desc'

  // 启动时恢复上次的数据（刷新不丢）
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      headers.value = saved.headers || []
      // 兼容旧数据：补 __id
      rows.value = (saved.rows || []).map(r => r.__id ? r : { __id: makeRowId(), ...r })
      sourcePath.value = saved.sourcePath || ''
      embedded.value = !!saved.embedded
      // 排序：单独 key，存于 DATA_KEY 内（不与数据共寿命，但放一起方便）
      sortKey.value = saved.sortKey || ''
      sortDir.value = saved.sortDir || ''
    }
  } catch (e) { /* 损坏则忽略 */ }

  // 数据变化 → 防抖持久化
  watch([headers, rows, sourcePath, embedded, sortKey, sortDir], () => {
    clearTimeout(dataSaveTimer)
    dataSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify({
          headers: headers.value,
          rows: rows.value,
          sourcePath: sourcePath.value,
          embedded: embedded.value,
          sortKey: sortKey.value,
          sortDir: sortDir.value
        }))
      } catch (e) {
        console.warn('数据自动保存失败:', e)
      }
    }, 500)
  }, { deep: true })

  const fields = computed(() => headers.value)

  const filteredRows = computed(() => {
    if (!filter.value.trim()) return rows.value
    const kw = filter.value.toLowerCase()
    return rows.value.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(kw))
    )
  })

  // 排序后的行（基于 filteredRows 再排序；不修改源 rows，UI 用 displayRows）
  // 排序：数字按数值比，字符串按 localeCompare（含 emoji/中文），null/空排最后
  const displayRows = computed(() => {
    const arr = filteredRows.value
    if (!sortKey.value || !sortDir.value) return arr
    const k = sortKey.value
    const dir = sortDir.value === 'desc' ? -1 : 1
    const numA = (s) => {
      const n = Number(s)
      return Number.isFinite(n) ? n : null
    }
    return [...arr].sort((a, b) => {
      const av = a[k] == null ? '' : String(a[k])
      const bv = b[k] == null ? '' : String(b[k])
      if (av === '' && bv === '') return 0
      if (av === '') return 1   // 空值排最后
      if (bv === '') return -1
      // 尝试按数字比
      const na = numA(av), nb = numA(bv)
      if (na != null && nb != null) return (na - nb) * dir
      return av.localeCompare(bv, 'zh-Hans-CN', { numeric: true }) * dir
    })
  })

  // 设置排序：列名 + 方向；与当前一致时切换方向
  function setSort(key) {
    if (sortKey.value !== key) {
      sortKey.value = key
      sortDir.value = 'asc'
    } else if (sortDir.value === 'asc') {
      sortDir.value = 'desc'
    } else {
      sortKey.value = ''
      sortDir.value = ''
    }
  }

  const activeRow = computed(() => displayRows.value[activeRowIndex.value] || {})

  function setData({ headers: h, rows: r, sourcePath: p = '', embedded: e = false }) {
    // 字段名去重（重复名加 _2, _3...后缀）
    const cleanHeaders = dedupFieldNames((h || []).map(s => String(s || '').replace(/^\uFEFF/, '').trim()))
    const newRows = (r || []).map(row => {
      const obj = { __id: makeRowId() }
      cleanHeaders.forEach((cn, i) => {
        const orig = (h || [])[i] || ''
        const v = row[orig] != null ? row[orig] : (row[cn] != null ? row[cn] : '')
        obj[cn] = String(v)
      })
      return obj
    })
    headers.value = cleanHeaders
    rows.value = newRows
    activeRowIndex.value = 0
    sourcePath.value = p
    embedded.value = e
    filter.value = ''
  }

  function clear() {
    headers.value = []
    rows.value = []
    activeRowIndex.value = 0
    sourcePath.value = ''
    embedded.value = false
    filter.value = ''
    sortKey.value = ''
    sortDir.value = ''
  }

  function setActiveIndex(i) {
    if (i >= 0 && i < displayRows.value.length) {
      activeRowIndex.value = i
    }
  }

  function setFilter(s) {
    filter.value = s
    if (activeRowIndex.value >= displayRows.value.length) {
      activeRowIndex.value = 0
    }
  }

  function addRow(row) {
    rows.value.push({ __id: makeRowId(), ...row })
  }

  // 按 __id 找行（避免 indexOf 在重复值行时错位；找不到则忽略）
  function _findIndexById(id) {
    if (id == null) return -1
    return rows.value.findIndex(r => r.__id === id)
  }

  function updateRow(idOrIndex, patch) {
    const i = typeof idOrIndex === 'string' ? _findIndexById(idOrIndex) : idOrIndex
    if (i >= 0 && i < rows.value.length) {
      // 类型校验：所有值转字符串（与 setData 一致），并限制单格最大长度避免卡顿
      const safe = {}
      for (const k in patch) {
        const v = patch[k]
        if (v == null) { safe[k] = ''; continue }
        const s = String(v)
        safe[k] = s.length > 1000 ? s.slice(0, 1000) : s
      }
      rows.value[i] = { ...rows.value[i], ...safe }
    }
  }

  function removeRow(idOrIndex) {
    const i = typeof idOrIndex === 'string' ? _findIndexById(idOrIndex) : idOrIndex
    if (i < 0 || i >= rows.value.length) return
    rows.value.splice(i, 1)
    if (activeRowIndex.value >= rows.value.length) {
      activeRowIndex.value = Math.max(0, rows.value.length - 1)
    }
  }

  // ============ 列管理（手动建表头，无 Excel 也能用） ============

  // 取一个不冲突的字段名
  function _nextColumnName(base) {
    const used = new Set(headers.value)
    const clean = (base || '').trim() || '新字段'
    if (!used.has(clean)) return clean
    let i = 2
    while (used.has(`${clean}_${i}`)) i++
    return `${clean}_${i}`
  }

  /** 添加一列；name 可省（自动命名"新字段"/"新字段_2"） */
  function addColumn(name) {
    const newName = _nextColumnName(name)
    headers.value = [...headers.value, newName]
    // 给每行补上空值
    rows.value = rows.value.map(r => ({ ...r, [newName]: r[newName] != null ? r[newName] : '' }))
    return newName
  }

  /** 重命名列（去重；不允许与已有列同名；同时级联更新 project 里的 binding + 文本模板 + fieldMap） */
  function renameColumn(oldName, newName) {
    if (!oldName || !headers.value.includes(oldName)) return oldName
    const target = (newName || '').trim()
    if (!target) return oldName
    if (target === oldName) return oldName
    if (headers.value.includes(target)) {
      // 冲突：返回失败标识（UI 层提示）
      throw new Error(`字段名 "${target}" 已存在`)
    }
    headers.value = headers.value.map(h => h === oldName ? target : h)
    rows.value = rows.value.map(r => {
      if (r[oldName] == null) return r
      const { [oldName]: v, ...rest } = r
      return { ...rest, [target]: v }
    })
    // 级联：project 里所有 component 的 binding + 文本 {{字段}} + fieldMap
    _cascadeProjectField(oldName, target, false)
    return target
  }

  /** 删除列（同时清理 project 里所有引用） */
  function removeColumn(name) {
    if (!name || !headers.value.includes(name)) return
    if (headers.value.length <= 1) {
      throw new Error('至少保留 1 个字段')
    }
    headers.value = headers.value.filter(h => h !== name)
    rows.value = rows.value.map(r => {
      if (r[name] == null) return r
      const { [name]: _, ...rest } = r
      return rest
    })
    _cascadeProjectField(name, '', true)
  }

  // 内部：级联更新 project 里对某字段的引用
  // remove=true：清除 binding、文本里把 {{xx}} 替换为空、fieldMap 删 key
  // remove=false：rename — 用新名替换 binding 与文本 {{xx}}
  // 走 store 的 updateComponent 单个更新（保留原组件引用，让 fabric/响应式能正确 diff，避免整体替换数组导致渲染层崩）
  function _cascadeProjectField(oldName, newName, remove) {
    try {
      const project = useProjectStore()
      const comps = project.project?.components
      if (!Array.isArray(comps)) return
      const escRe = oldName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')
      const re = new RegExp(`\\{\\{\\s*${escRe}\\s*\\}\\}`, 'g')

      comps.forEach(c => {
        if (!c || typeof c !== 'object') return
        const patch = {}
        // 1. 顶层 binding
        if (c.binding === oldName) patch.binding = remove ? '' : newName
        // 2. 文本里的 {{字段}} 占位
        if (typeof c.text === 'string' && re.test(c.text)) {
          patch.text = c.text.replace(re, remove ? '' : `{{${newName}}}`)
        }
        // 3. 表格 cells：按 cell 维度更新（cells 整体小，直接替换）
        if (c.cells && typeof c.cells === 'object') {
          let cellChanged = false
          const newCells = {}
          for (const k in c.cells) {
            const cell = c.cells[k]
            if (!cell || typeof cell !== 'object') { newCells[k] = cell; continue }
            const nc = { ...cell }
            if (nc.binding === oldName) { nc.binding = remove ? '' : newName; cellChanged = true }
            if (typeof nc.text === 'string' && re.test(nc.text)) {
              nc.text = nc.text.replace(re, remove ? '' : `{{${newName}}`)
              cellChanged = true
            }
            newCells[k] = nc
          }
          if (cellChanged) patch.cells = newCells
        }
        if (Object.keys(patch).length) {
          project.updateComponent(c.id, patch)
        }
      })

      // 4. fieldMap（独立于 components）
      const fm = project.project.dataSource?.fieldMap
      if (fm && oldName in fm) {
        const nextFm = { ...fm }
        if (remove) {
          delete nextFm[oldName]
        } else {
          nextFm[newName] = nextFm[oldName]
          delete nextFm[oldName]
        }
        project.updateFieldMap(nextFm)
      }
    } catch (e) {
      // project store 未初始化等情况下静默忽略（极端场景）
      console.warn('cascade field rename/remove failed:', e)
    }
  }

  return {
    headers, rows, activeRowIndex, filter, sourcePath, embedded,
    sortKey, sortDir,
    fields, filteredRows, displayRows, activeRow,
    setData, clear, setActiveIndex, setFilter, setSort,
    addRow, updateRow, removeRow,
    addColumn, renameColumn, removeColumn
  }
})
