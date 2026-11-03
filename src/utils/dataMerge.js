// 追加/合并：导入新数据时与现有数据按列名合并
// 语义：同名列沿用旧列；新列追加到末尾；旧行补空新列、新行补空旧列
// 备注：避免「重新导入 Excel」时把已编辑的数据清空
// 依赖：旧 rows 是对象数组（data.rows 形态）
//       新 rows 可以是对象数组（parseExcelFile 的实际返回）或二维数组（按列下标）
//       setData 也接收对象数组

/**
 * 合并两个数据集
 * @param {string[]} oldHeaders 旧列名
 * @param {Object[]} oldRows 旧行（对象数组，按列名取值）
 * @param {string[]} newHeaders 新列名
 * @param {Array[]|Object[]} newRows 新行（对象数组，或二维数组按列下标取值）
 * @returns {{ headers: string[], rows: Object[] }}
 */
export function mergeDataAppend(oldHeaders, oldRows, newHeaders, newRows) {
  const safeOldHeaders = Array.isArray(oldHeaders) ? oldHeaders : []
  const safeNewHeaders = Array.isArray(newHeaders) ? newHeaders : []
  const safeOldRows = Array.isArray(oldRows) ? oldRows : []
  const safeNewRows = Array.isArray(newRows) ? newRows : []

  // 合并列：保留旧列顺序，新列追加
  const mergedHeaders = [...safeOldHeaders]
  for (const h of safeNewHeaders) {
    if (h && !mergedHeaders.includes(h)) mergedHeaders.push(h)
  }

  // 旧行：对象数组直接按合并列重映射（缺列填空）
  const oldRowsObj = safeOldRows.map(r => {
    const obj = {}
    for (const h of mergedHeaders) {
      obj[h] = (r && r[h] != null) ? r[h] : ''
    }
    return obj
  })

  // 新行：对象按列名取；二维数组按 newHeaders 下标取。缺列填空
  const newRowsObj = safeNewRows.map(row => {
    const obj = {}
    const asArray = Array.isArray(row)
    for (const h of mergedHeaders) {
      if (asArray) {
        const i = safeNewHeaders.indexOf(h)
        obj[h] = (i >= 0 && row[i] != null) ? row[i] : ''
      } else if (row && typeof row === 'object' && row[h] != null) {
        obj[h] = row[h]
      } else {
        obj[h] = ''
      }
    }
    return obj
  })

  return {
    headers: mergedHeaders,
    rows: [...oldRowsObj, ...newRowsObj]
  }
}

/** 常见主键列名（按优先级） */
export const MERGE_KEY_CANDIDATES = [
  '条码',
  'SKU',
  'sku',
  '货号',
  '商品编码',
  '资产编号',
  '运单号',
  '单号',
  '编号',
  '款号'
]

function rowToObject(row, mergedHeaders, sourceHeaders) {
  const obj = {}
  const asArray = Array.isArray(row)
  const src = sourceHeaders || mergedHeaders
  for (const h of mergedHeaders) {
    if (asArray) {
      const i = src.indexOf(h)
      obj[h] = (i >= 0 && row[i] != null) ? row[i] : ''
    } else if (row && typeof row === 'object' && row[h] != null) {
      obj[h] = row[h]
    } else {
      obj[h] = ''
    }
  }
  return obj
}

export function guessMergeKey(headers = [], extraCandidates = []) {
  const cols = headers || []
  const tryList = [...extraCandidates, ...MERGE_KEY_CANDIDATES]
  for (const key of tryList) {
    if (key && cols.includes(key)) return key
  }
  return ''
}

function rowKey(row, keyColumn, headers) {
  if (!row || !keyColumn) return ''
  if (typeof row === 'object' && !Array.isArray(row)) {
    const v = row[keyColumn]
    return v != null ? String(v).trim() : ''
  }
  const i = (headers || []).indexOf(keyColumn)
  if (i < 0) return ''
  const v = row[i]
  return v != null ? String(v).trim() : ''
}

/**
 * 按主键列增量更新：同键更新列值，新键追加；空键行仍走 append 语义（追加新行）。
 */
export function mergeDataByKey(oldHeaders, oldRows, newHeaders, newRows, keyColumn) {
  const key = String(keyColumn || '').trim()
  if (!key) return mergeDataAppend(oldHeaders, oldRows, newHeaders, newRows)

  const safeOldHeaders = Array.isArray(oldHeaders) ? oldHeaders : []
  const safeNewHeaders = Array.isArray(newHeaders) ? newHeaders : []
  const safeOldRows = Array.isArray(oldRows) ? oldRows : []
  const safeNewRows = Array.isArray(newRows) ? newRows : []

  const mergedHeaders = [...safeOldHeaders]
  for (const h of safeNewHeaders) {
    if (h && !mergedHeaders.includes(h)) mergedHeaders.push(h)
  }

  const outRows = safeOldRows.map((r) => rowToObject(r, mergedHeaders, safeOldHeaders))
  const indexByKey = new Map()
  outRows.forEach((r, i) => {
    const k = rowKey(r, key, mergedHeaders)
    if (k) indexByKey.set(k, i)
  })

  for (const raw of safeNewRows) {
    const obj = rowToObject(raw, mergedHeaders, safeNewHeaders)
    const k = rowKey(obj, key, mergedHeaders)
    if (!k) {
      outRows.push(obj)
      continue
    }
    const idx = indexByKey.get(k)
    if (idx == null) {
      indexByKey.set(k, outRows.length)
      outRows.push(obj)
    } else {
      const prev = outRows[idx]
      const next = { ...prev }
      for (const h of mergedHeaders) {
        if (h === key) continue
        if (obj[h] != null && obj[h] !== '') next[h] = obj[h]
      }
      outRows[idx] = next
    }
  }

  return { headers: mergedHeaders, rows: outRows }
}

/** 从对象行收集列名，跳过内部键 __id。列顺序按首次出现。 */
export function headersFromRows(rows) {
  const keys = []
  const seen = new Set()
  for (const row of rows || []) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    for (const k of Object.keys(row)) {
      if (!k || k === '__id' || seen.has(k)) continue
      seen.add(k)
      keys.push(k)
    }
  }
  return keys
}
