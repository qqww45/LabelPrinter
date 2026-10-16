/**
 * 表格几何。设计画布、预览/打印/PNG、矢量 PDF 都调用这里。
 * 行高只由表格高度和行数决定：换行、二维码、条码缩在格子里，不撑行。
 * 最后一格吃掉除法余数，保证各格之和等于表格宽高。
 */

function axisCount(value) {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function fitSum(parts, total) {
  if (parts.length === 0) return parts
  const used = parts.slice(0, -1).reduce((a, b) => a + b, 0)
  parts[parts.length - 1] = total - used
  return parts
}

/** 列宽按 colWidths 比例分，数量对不上时等分。单位与 totalW 相同。 */
export function tableColumnWidths(c, totalW) {
  const cols = axisCount(c?.cols)
  const weights = (Array.isArray(c?.colWidths) && c.colWidths.length === cols)
    ? c.colWidths.map(w => Math.max(0.05, Number(w) || 0))
    : Array(cols).fill(1)
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  return fitSum(weights.map(w => totalW * w / sum), totalW)
}

/** 行高均分 totalH。内容不参与计算。单位与 totalH 相同。 */
export function tableRowHeights(c, totalH) {
  const rows = axisCount(c?.rows)
  const each = totalH / rows
  return fitSum(Array(rows).fill(each), totalH)
}

/** 每段起点。画布和 PDF 的网格线都用这个，避免各自累加。 */
export function sizeOffsets(sizes) {
  const out = []
  let acc = 0
  for (const n of sizes) {
    out.push(acc)
    acc += n
  }
  return out
}
