/**
 * 模板渲染：把 {{字段}} 占位符替换为实际数据
 */
export function renderText(text, row) {
  if (!text) return ''
  if (!row) return text
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const k = key.trim()
    if (row[k] !== undefined && row[k] !== null) return row[k]
    return ''
  })
}

/**
 * 字段映射：把数据源行转成"模板字段行"
 * fieldMap = { 模板字段: 数据源字段 }
 * 例：{ 商品名称: '产品名称' } → row.产品名称 的值同时提供给 {{商品名称}}
 * 未映射的字段保持原名可用（兼容同名直接使用）
 */
export function resolveRow(row, fieldMap) {
  if (!row) return {}
  const map = fieldMap || {}
  const keys = Object.keys(map)
  if (!keys.length) return row
  const out = { ...row }
  for (const tpl of keys) {
    const src = map[tpl]
    if (!src) continue
    if (row[src] !== undefined && row[src] !== null) out[tpl] = row[src]
  }
  return out
}

/**
 * 收集模板中引用到的所有字段名：
 * - 文本 / 日期 / 二维码 / 条码的绑定字段
 * - 文本内容里的 {{占位符}}
 * - 表格单元格的绑定字段与 {{占位符}}
 * - 图片组件的字段来源
 */
export function extractTemplateFields(components = []) {
  const set = new Set()
  const addPlaceholders = (text) => {
    if (typeof text !== 'string') return
    const re = /\{\{([^}]+)\}\}/g
    let m
    while ((m = re.exec(text))) {
      const k = m[1].trim()
      if (k) set.add(k)
    }
  }

  for (const c of components) {
    if (!c) continue
    if (c.binding) set.add(c.binding)
    if (c.text) addPlaceholders(c.text)
    if (c.type === 'table' && c.cells) {
      for (const key of Object.keys(c.cells)) {
        const cell = c.cells[key]
        if (!cell) continue
        if (cell.binding) set.add(cell.binding)
        if (cell.text) addPlaceholders(cell.text)
      }
    }
  }
  return Array.from(set)
}

/**
 * 自动匹配：模板字段与数据源字段同名（忽略大小写/空格）时自动建立映射
 * 返回新的 fieldMap（已存在的映射不覆盖）
 */
export function autoMatchFieldMap(templateFields = [], dataFields = [], current = {}) {
  const out = { ...(current || {}) }
  const norm = (s) => String(s || '').trim().toLowerCase()
  const byNorm = new Map()
  for (const f of dataFields) byNorm.set(norm(f), f)
  for (const tf of templateFields) {
    if (out[tf]) continue
    const hit = byNorm.get(norm(tf)) || dataFields.find(f => norm(f) === norm(tf))
    if (hit) out[tf] = hit
  }
  return out
}

/**
 * 未映射的模板字段（既没有映射，数据源里也没有同名字段）
 */
export function findUnmappedFields(templateFields = [], dataFields = [], fieldMap = {}) {
  return templateFields.filter(tf => {
    if (fieldMap[tf]) return false
    return !dataFields.includes(tf)
  })
}

/**
 * 渲染文本 + 标记「数据里不存在的字段」（设计态提示用，不影响打印）
 * 三种情况区分开，避免误报：
 *   1) 字段存在且有值        → 替换为值
 *   2) 字段存在但当前行没值   → 替换为空串（正常，不报警）
 *   3) 字段在数据源/映射中都没有 → 替换为 ⚠字段名，并记入 missing
 * @param {string} text 原始文本
 * @param {object} row  数据行
 * @param {Set<string>} availableSet 可用字段集合（不传则退化为 renderText 行为，永不报警）
 * @returns {{ text: string, missing: string[] }}
 */
export function renderTextWithAlert(text, row, availableSet) {
  if (!text) return { text: '', missing: [] }
  if (!row) return { text, missing: [] }
  // 无法判断字段是否存在（没导入数据）时，保持与 renderText 完全一致的行为：占位符替换为空
  const canAlert = !!(availableSet && availableSet.size)
  const missing = []
  const out = String(text).replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const k = key.trim()
    if (row[k] !== undefined && row[k] !== null) return row[k]
    if (canAlert && !availableSet.has(k)) {
      if (!missing.includes(k)) missing.push(k)
      return `⚠${k}`
    }
    return ''
  })
  return { text: out, missing }
}
