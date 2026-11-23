/**
 * 条码/二维码/文本的数据绑定模式（纯逻辑，可单测）。
 * 固定文本 / 表格列 / 自增序号 / 批量列表 —— 全部落在现有行模型上。
 */

export const DATA_BIND_MODES = ['fixed', 'field', 'serial', 'batch']

export function normalizeDataMode(component) {
  const m = String(component?.dataMode || '').toLowerCase()
  if (DATA_BIND_MODES.includes(m)) return m
  if (component?.binding) return 'field'
  return 'fixed'
}

/** 解析批量粘贴：去空行、截断过长 */
export function parseBatchLines(raw, maxLines = 5000) {
  return String(raw || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, maxLines)
}

/**
 * 把批量列表写入表格：确保列存在，并按行填充（行不够则追加）。
 * @returns {{ column: string, rowCount: number, lines: number }}
 */
export function applyBatchListToTable({ headers, rows, columnName, lines, makeRowId }) {
  const list = Array.isArray(lines) ? lines : parseBatchLines(lines)
  if (!list.length) return { headers, rows, column: columnName || '', rowCount: rows?.length || 0, lines: 0 }

  let col = String(columnName || '').trim()
  const hdrs = Array.isArray(headers) ? headers.slice() : []
  const nextName = (base) => {
    const used = new Set(hdrs)
    const b = base || '批量数据'
    if (!used.has(b)) return b
    let i = 2
    while (used.has(`${b}_${i}`)) i++
    return `${b}_${i}`
  }
  if (!col) col = nextName('批量数据')
  if (!hdrs.includes(col)) hdrs.push(col)

  const outRows = Array.isArray(rows) ? rows.map(r => ({ ...r })) : []
  const need = Math.max(list.length, outRows.length || list.length)

  while (outRows.length < need) {
    outRows.push({ __id: makeRowId ? makeRowId() : `r_${outRows.length}` })
  }
  for (const r of outRows) {
    for (const h of hdrs) {
      if (r[h] == null) r[h] = ''
    }
  }
  list.forEach((val, i) => {
    if (i < outRows.length) outRows[i][col] = String(val)
  })

  return { headers: hdrs, rows: outRows, column: col, rowCount: outRows.length, lines: list.length }
}