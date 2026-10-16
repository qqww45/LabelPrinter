/**
 * 设计体检（Preflight）：集中检测「会导致打出来空白 / 不对」的问题。
 *
 * 三处共用，保证口径一致：
 *   1) 画布设计态提示（DesignCanvas）—— 让问题元素自己“喊出来”
 *   2) 属性面板即时预警（PropertyPanel）—— 选中的组件当场校验
 *   3) 打印 / 导出前体检（PreflightCheckDialog）—— 动手前先看清楚
 *
 * 纯函数、无副作用，方便单测。
 */
import { expandPrintLabels } from './printModel.js'

/**
 * 单个组件引用到的所有字段名：
 * - binding（绑定字段）
 * - 文本里的 {{占位符}}
 * - 表格各单元格的 binding 与 {{占位符}}
 */
export function componentFields(c) {
  const set = new Set()
  if (!c) return []
  if (c.binding) set.add(c.binding)
  const scan = (text) => {
    if (typeof text !== 'string') return
    const re = /\{\{([^}]+)\}\}/g
    let m
    while ((m = re.exec(text))) {
      const k = m[1].trim()
      if (k) set.add(k)
    }
  }
  scan(c.text)
  if (c.type === 'table' && c.cells) {
    for (const cell of Object.values(c.cells)) {
      if (!cell) continue
      if (cell.binding) set.add(cell.binding)
      scan(cell.text)
    }
  }
  return Array.from(set)
}

/**
 * 可用字段集合 = 数据源列名 ∪「已成功映射」的模板字段名
 * （resolveRow 会把映射源的值填进模板字段名，所以映射成功的也算可用）
 */
export function availableFields(dataFields = [], fieldMap = {}) {
  const s = new Set(dataFields)
  for (const [tpl, src] of Object.entries(fieldMap || {})) {
    if (src && dataFields.includes(src)) s.add(tpl)
  }
  return s
}

/**
 * 单个组件里「数据里找不到」的字段
 * 数据源为空时一律返回空数组 —— 那种情况由 no-data 单独提示，避免全线误报
 */
export function componentMissingFields(c, avail) {
  if (!avail || !avail.size) return []
  return componentFields(c).filter(f => !avail.has(f))
}

/**
 * 按组件汇总缺失字段（数据源为空时返回空数组）
 * @returns {Array<{id:string,name:string,fields:string[]}>}
 */
export function missingFieldsByComponent(components = [], dataFields = [], fieldMap = {}) {
  if (!dataFields.length) return []
  const avail = availableFields(dataFields, fieldMap)
  const out = []
  for (const c of components) {
    const miss = componentMissingFields(c, avail)
    if (miss.length) out.push({ id: c.id, name: c.name || c.type, fields: miss })
  }
  return out
}

/**
 * 元素超出标签边界检测
 * 文本组件的高度由内容撑开（Textbox 自适应），故不判断底边，避免误报
 */
export function findOutOfBounds(components = [], label = {}) {
  const W = Number(label?.width) || 0
  const H = Number(label?.height) || 0
  if (!W || !H) return []
  const TOL = 0.6 // mm，容忍取整误差
  const out = []
  for (const c of components) {
    const x = Number(c.left) || 0
    const y = Number(c.top) || 0
    const w = Number(c.width) || 0
    const h = Number(c.height) || 0
    const reasons = []
    if (x < -TOL) reasons.push('left')
    if (y < -TOL) reasons.push('top')
    if (w > 0 && x + w > W + TOL) reasons.push('right')
    // 文本类高度常随内容变化，底边不判越界（与 text 一致）
    const softBottom = c.type === 'text' || c.type === 'date' || c.type === 'serial' || c.type === 'checkbox'
    if (!softBottom && h > 0 && y + h > H + TOL) reasons.push('bottom')
    if (reasons.length) {
      out.push({
        id: c.id,
        name: c.name || c.type,
        reasons,
        overflowRight: w > 0 ? Math.max(0, x + w - W) : 0,
        overflowBottom: (!softBottom && h > 0) ? Math.max(0, y + h - H) : 0
      })
    }
  }
  return out
}

/**
 * 全量体检
 * @returns {{ issues:Array, errors:Array, warnings:Array, hasError:boolean, summary:object }}
 */
export function runDiagnostics({
  components = [],
  dataFields = [],
  fieldMap = {},
  rowCount = 0,
  label = {},
  paper = {},
  perPage = 1,
  printConfig = {},
  rows
} = {}) {
  const issues = []

  // ① 画布为空 —— 打出来必然空白
  if (!components.length) {
    issues.push({
      level: 'error',
      code: 'empty-canvas',
      title: '画布上还没有任何元素',
      detail: '现在打印只会得到一张空白标签。请从左侧组件面板拖入文字、条码、表格等元素。',
      fix: 'none'
    })
  }

  // ② 字段对不上 —— 最致命的「静默变空白」
  const missComp = missingFieldsByComponent(components, dataFields, fieldMap)
  if (missComp.length) {
    const fields = [...new Set(missComp.flatMap(m => m.fields))]
    issues.push({
      level: 'error',
      code: 'missing-fields',
      title: `${fields.length} 个字段在数据里找不到`,
      detail: `这些位置会显示 ⚠ 标记或空白：${fields.map(f => `「${f}」`).join('、')}。可用「字段映射」把它们对应到真实的列名。`,
      fix: 'field-map',
      ids: missComp.map(m => m.id),
      fields
    })
  }

  // ③ 元素越界 —— 打印被裁切
  const oob = findOutOfBounds(components, label)
  if (oob.length) {
    issues.push({
      level: 'warn',
      code: 'out-of-bounds',
      title: `${oob.length} 个元素超出标签范围`,
      detail: '超出标签的部分不会被打印出来。建议把它们移回标签内，或调整标签尺寸。',
      fix: 'select',
      ids: oob.map(o => o.id)
    })
  }

  // ④ 没有数据 —— 只出一张标签
  if (!rowCount) {
    issues.push({
      level: 'warn',
      code: 'no-data',
      title: '还没有数据',
      detail: '将只能打印 1 张（固定文字仍会输出，字段位置为空白）。导入 Excel / CSV 后即可批量打印。',
      fix: 'import'
    })
  }

  const errors = issues.filter(i => i.level === 'error')
  const warnings = issues.filter(i => i.level === 'warn')
  const safePerPage = Math.max(1, Number(perPage) || 1)
  const copies = Math.max(1, Number(printConfig?.copies) || 1)
  // 传入数据行时，页数按展开后的张数算（份数、按列份数已经乘进去），界面不再另乘一次
  let pages = rowCount ? Math.max(1, Math.ceil(rowCount / safePerPage)) : 1
  let copiesShown = copies
  if (Array.isArray(rows)) {
    const n = rows.length ? expandPrintLabels(rows, printConfig).length : 0
    pages = n ? Math.max(1, Math.ceil(n / safePerPage)) : 1
    copiesShown = 1
  }

  return {
    issues,
    errors,
    warnings,
    hasError: errors.length > 0,
    summary: {
      labelText: (label.width && label.height) ? `${label.width}×${label.height}mm` : '—',
      paperText: (paper.width && paper.height) ? `${paper.width}×${paper.height}mm` : '—',
      rowCount,
      perPage: safePerPage,
      pages,
      copies: copiesShown,
      totalSheets: pages * copiesShown
    }
  }
}
