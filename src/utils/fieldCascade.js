/** 把字段名转成可放进正则的字面量 */
export function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 替换文本里的 {{字段}}。每次新建正则，避免 /g 的 lastIndex 漏匹配。
 * remove 时换成空串；否则换成 {{newName}}（括号成对）。
 */
export function replaceFieldToken(text, oldName, newName, remove) {
  if (typeof text !== 'string' || !oldName) return text
  const re = new RegExp(`\\{\\{\\s*${escapeRegExp(oldName)}\\s*\\}\\}`, 'g')
  return text.replace(re, remove ? '' : `{{${newName}}}`)
}

/**
 * fieldMap = { 模板字段: 数据列 }。
 * 重命名数据列时，键（模板字段）和值（数据列）只要等于旧名都要改。
 * 有变化返回新对象，否则返回 null。
 */
export function rewriteFieldMap(fm, oldName, newName, remove) {
  if (!fm || typeof fm !== 'object' || !oldName) return null
  const next = {}
  let changed = false
  for (const [k, v] of Object.entries(fm)) {
    let nk = k
    let nv = v
    if (k === oldName) {
      changed = true
      if (remove) continue
      nk = newName
    }
    if (v === oldName) {
      changed = true
      nv = remove ? '' : newName
    }
    next[nk] = nv
  }
  return changed ? next : null
}
