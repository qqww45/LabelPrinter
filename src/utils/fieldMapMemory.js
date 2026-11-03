/**
 * 按列名签名记住字段映射，重新导入同结构表时可一键恢复。
 */

export function headersSignature(headers = []) {
  return headers
    .filter((h) => h && h !== '__id')
    .map((h) => String(h).trim())
    .sort()
    .join('\u0001')
}

export function lookupSavedFieldMap(dataSource, headers) {
  const sig = headersSignature(headers)
  if (!sig) return null
  const archive = dataSource?.fieldMapArchive
  if (!archive || typeof archive !== 'object') return null
  const hit = archive[sig]
  if (!hit || typeof hit !== 'object') return null
  return { ...hit }
}

/** 写入项目 dataSource.fieldMapArchive（调用方负责 markDirty / embed） */
export function rememberFieldMap(dataSource, headers, fieldMap) {
  if (!dataSource) return
  const sig = headersSignature(headers)
  const map = fieldMap || {}
  if (!sig || !Object.keys(map).length) return
  dataSource.fieldMapArchive = {
    ...(dataSource.fieldMapArchive || {}),
    [sig]: { ...map }
  }
}

/** 只保留仍存在于新表头里的映射项 */
export function sanitizeFieldMapForHeaders(fieldMap, headers) {
  const cols = new Set(headers || [])
  const out = {}
  for (const [tpl, src] of Object.entries(fieldMap || {})) {
    if (src && cols.has(src)) out[tpl] = src
  }
  return out
}
