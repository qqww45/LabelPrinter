// 追加/合并：导入新数据时与现有数据按列名合并
// 语义：同名列沿用旧列；新列追加到末尾；旧行补空新列、新行补空旧列
// 备注：避免「重新导入 Excel」时把已编辑的数据清空
// 依赖：旧 rows 是对象数组（data.rows 形态），新 rows 是二维数组（parseExcelFile 形态）
//       setData 也接收对象数组

/**
 * 合并两个数据集
 * @param {string[]} oldHeaders 旧列名
 * @param {Object[]} oldRows 旧行（对象数组，按列名取值）
 * @param {string[]} newHeaders 新列名
 * @param {Array[]} newRows 新行（二维数组，按列索引取值）
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

  // 新行：二维数组按 newHeaders 索引取（缺列填空）
  const newRowsObj = safeNewRows.map(row => {
    const obj = {}
    for (const h of mergedHeaders) {
      const i = safeNewHeaders.indexOf(h)
      obj[h] = (i >= 0 && Array.isArray(row) && row[i] != null) ? row[i] : ''
    }
    return obj
  })

  return {
    headers: mergedHeaders,
    rows: [...oldRowsObj, ...newRowsObj]
  }
}
