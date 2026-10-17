function cleanNames(list) {
  const out = []
  const seen = new Set()
  for (const raw of list || []) {
    const name = String(raw ?? '').trim()
    if (!name || name === '__id' || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/**
 * 新表的列和版式用到的字段对一下。
 * 映射成功（版式字段 ← 表里的另一列）算对上。
 */
export function matchColumns(headers, needed, fieldMap = {}) {
  const incoming = cleanNames(headers)
  const incomingSet = new Set(incoming)
  const fields = cleanNames(needed)
  const map = fieldMap || {}
  const matched = []
  const missing = []
  const used = new Set()
  for (const name of fields) {
    const src = map[name]
    if (incomingSet.has(name)) {
      matched.push(name)
      used.add(name)
    } else if (src && incomingSet.has(src)) {
      matched.push(name)
      used.add(src)
    } else {
      missing.push(name)
    }
  }
  return {
    matched,
    missing,
    extra: incoming.filter(name => !used.has(name))
  }
}
