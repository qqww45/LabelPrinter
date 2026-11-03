/**
 * 按列份数：导入 / 打印设置里识别常见的数量列名。
 */
const COPY_ALIASES = new Set([
  '数量', '份数', '打印份数', '打印数量', 'copies', 'copy', 'qty', 'quantity', 'count', 'num'
])

function normHeader(s) {
  return String(s || '').trim().toLowerCase().replace(/[\s_\-]/g, '')
}

/** 在表头里猜份数列；已有有效配置时不覆盖。 */
export function guessCopiesColumn(headers = [], current = '') {
  const list = Array.isArray(headers) ? headers : []
  if (current && list.includes(current)) return current
  for (const h of list) {
    if (COPY_ALIASES.has(normHeader(h))) return h
  }
  for (const h of list) {
    const n = normHeader(h)
    if (n.includes('qty') || n.includes('copies') || n.includes('quantity')) return h
    if (n.endsWith('数量') || n.endsWith('份数')) return h
  }
  return current || ''
}

/** 导入后若尚未指定份数列，则写入 printConfig（仅当猜中且列存在）。 */
export function applyCopiesColumnHint(projectStore, headers) {
  if (!projectStore?.project?.printConfig) return null
  const cfg = projectStore.project.printConfig
  if (cfg.copiesColumn && headers.includes(cfg.copiesColumn)) return null
  const hit = guessCopiesColumn(headers, cfg.copiesColumn || '')
  if (!hit || !headers.includes(hit)) return null
  cfg.copiesColumn = hit
  projectStore.markDirty?.()
  return hit
}
