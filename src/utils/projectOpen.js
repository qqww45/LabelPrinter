/** 文件名去掉后缀，当作没有项目名时的名字。 */
export function fileProjectName(raw, fileName = '') {
  const fromMeta = String(raw?.meta?.name || '').trim()
  if (fromMeta) return fromMeta
  const fromFile = String(fileName || '').replace(/\.(json|lbp)$/i, '').trim()
  return fromFile || '未命名项目'
}

/**
 * 从文件打开：插到列表最前，并切过去。
 * 不改已有条目的 data，避免把当前项目盖掉。
 */
export function insertOpenedProject(list, incoming, { id, now = Date.now(), fileName = '' } = {}) {
  const data = JSON.parse(JSON.stringify(incoming || {}))
  const name = fileProjectName(data, fileName)
  if (!data.meta || typeof data.meta !== 'object') data.meta = {}
  if (!String(data.meta.name || '').trim()) data.meta.name = name
  const entry = { id, name, updatedAt: now, data }
  const kept = (Array.isArray(list) ? list : []).map(p => ({ ...p, data: p.data }))
  return { list: [entry, ...kept], currentId: id, name }
}
