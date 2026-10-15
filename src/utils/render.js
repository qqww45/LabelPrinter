/**
 * 没有可替换的数据行：null、或只有内部键的空对象。
 * 有列名的空行（值为空字符串）不算空，那种情况按「该格没填」处理。
 */
export function rowIsEmpty(row) {
  if (!row || typeof row !== 'object') return true
  return !Object.keys(row).some(k => k !== '__id')
}

/**
 * 模板渲染：把 {{字段}} 占位符替换为实际数据。
 * 还没有数据行时保留原文，让版式上能看见字段名。
 */
export function renderText(text, row) {
  if (!text) return ''
  if (rowIsEmpty(row)) return text
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const k = key.trim()
    if (row[k] !== undefined && row[k] !== null) return row[k]
    return ''
  })
}

/**
 * 条码 / 二维码要编码的内容。
 * 绑定了字段：只用该格的值。空格子返回空，不要退回静态文字（新建二维码默认写着 QR）。
 * 没绑定：用组件上的静态文本。静态文本里还有 {{ }} 时也不拿去编码。
 */
export function codePayload(component, row) {
  if (!component) return ''
  if (component.binding && !rowIsEmpty(row)) {
    const v = row[component.binding]
    if (v !== undefined && v !== null && String(v) !== '') return String(v)
    return ''
  }
  const staticText = component.text != null ? String(component.text) : ''
  if (staticText && !staticText.includes('{{')) return staticText
  return ''
}

/** 占位符和警告标记不能拿去生成条码 / 二维码 */
export function isEncodableCode(value) {
  const s = value == null ? '' : String(value).trim()
  if (!s || s.includes('{{')) return false
  return true
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
  // 没导入数据时保留 {{字段}}，与 renderText 一致，避免版式变成空白
  if (rowIsEmpty(row)) return { text, missing: [] }
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

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 文本里出现过的 {{字段}}，按出现顺序、去重 */
export function placeholderNames(text) {
  if (!text) return []
  const out = []
  const re = /\{\{\s*([^}]+)\s*\}\}/g
  let m
  while ((m = re.exec(text))) {
    const k = m[1].trim()
    if (k && !out.includes(k)) out.push(k)
  }
  return out
}

function replacePlaceholder(text, name, replacement) {
  if (!name) return text
  return String(text).replace(
    new RegExp(`\\{\\{\\s*${escapeReg(name)}\\s*\\}\\}`, 'g'),
    replacement
  )
}

/**
 * 换绑时改写文本里的占位符，保留前后缀。
 * {{名称}}111 + 名称 → ID号  =>  {{ID号}}111
 * 只有一个占位符、且对不上旧绑定时，也改成新字段。
 * 多个占位符且旧绑定不在其中：不动，避免改错别的字段。
 */
export function rewriteBindingText(text, oldBinding, newBinding) {
  const src = text || ''
  const names = placeholderNames(src)
  const oldName = oldBinding || ''
  const next = newBinding || ''
  if (next) {
    if (oldName && names.includes(oldName)) return replacePlaceholder(src, oldName, `{{${next}}}`)
    if (names.length === 1) return replacePlaceholder(src, names[0], `{{${next}}}`)
    if (!names.length) return `{{${next}}}`
    return src
  }
  if (oldName && names.includes(oldName)) {
    return replacePlaceholder(src, oldName, '').replace(/[ \t]{2,}/g, ' ')
  }
  if (names.length === 1) {
    return replacePlaceholder(src, names[0], '').replace(/[ \t]{2,}/g, ' ')
  }
  return src
}

function fieldAvailable(name, dataFields, fieldMap) {
  if (!name) return false
  if ((dataFields || []).includes(name)) return true
  const src = fieldMap && fieldMap[name]
  return !!(src && (dataFields || []).includes(src))
}

/**
 * 绑定已经是数据里的列，但文本还留着一个数据里没有的 {{旧字段}}。
 * 只改这一种，映射成功或用户写了多个字段时不动。
 */
export function reconcileBoundText(text, binding, dataFields = [], fieldMap = {}) {
  const src = text || ''
  if (!binding) return src
  const names = placeholderNames(src)
  if (names.length !== 1 || names[0] === binding) return src
  if (fieldAvailable(names[0], dataFields, fieldMap)) return src
  if (!fieldAvailable(binding, dataFields, fieldMap)) return src
  return rewriteBindingText(src, names[0], binding)
}

/** 文本组件、表格单元格：绑定已指向现有列，但占位符还是旧列名 */
export function collectBindingTextFixes(components, dataFields, fieldMap) {
  const fixes = []
  for (const c of components || []) {
    if (!c) continue
    if (c.type === 'text' && c.binding) {
      const next = reconcileBoundText(c.text || '', c.binding, dataFields, fieldMap)
      if (next !== (c.text || '')) fixes.push({ id: c.id, text: next })
    }
    if (c.type === 'table' && c.cells) {
      let changed = false
      const cells = JSON.parse(JSON.stringify(c.cells))
      for (const cell of Object.values(cells)) {
        if (!cell || (cell.type && cell.type !== 'text') || !cell.binding) continue
        const next = reconcileBoundText(cell.text || '', cell.binding, dataFields, fieldMap)
        if (next !== (cell.text || '')) {
          cell.text = next
          changed = true
        }
      }
      if (changed) fixes.push({ id: c.id, cells })
    }
  }
  return fixes
}
