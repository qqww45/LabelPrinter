/**
 * 新增控件（序号 / 勾选框）的纯展示逻辑。
 * 画布、预览、PDF、热敏指令共用，避免各算各的。
 */
import { rowIsEmpty } from './render.js'

/** 字段值是否视为「勾选」：空/0/否/false 等为否，其余非空为是 */
export function isTruthyField(value) {
  if (value == null) return false
  const s = String(value).trim()
  if (!s) return false
  const low = s.toLowerCase()
  return !['0', 'false', 'n', 'no', '否', '无', 'off', '×', 'x', '□', '☐', '未'].includes(low)
}

/**
 * 序号展示文案。
 * - source=field：用 binding 列
 * - 默认：用打印展开写入的「序号」
 * - 尚无数据行：用样例数字方便排版
 */
export function formatSerialText(c, row) {
  const prefix = c?.prefix != null ? String(c.prefix) : ''
  const suffix = c?.suffix != null ? String(c.suffix) : ''
  const padRaw = Math.floor(Number(c?.pad))
  const pad = Number.isFinite(padRaw) ? Math.max(0, Math.min(12, padRaw)) : 0

  let raw = ''
  if (rowIsEmpty(row)) {
    raw = '1'
  } else if (c?.source === 'field') {
    const v = row?.[c.binding]
    if (v == null || String(v).trim() === '') return ''
    raw = String(v).trim()
  } else {
    const v = row?.['序号']
    if (v == null || String(v).trim() === '') return ''
    raw = String(v).trim()
  }

  let body = raw
  if (pad > 0 && /^\d+$/.test(body)) body = body.padStart(pad, '0')
  return prefix + body + suffix
}

/** 勾选框展示字符（可自定义 checkedChar / uncheckedChar） */
export function formatCheckboxText(c, row) {
  const on = c?.checkedChar != null && String(c.checkedChar) !== '' ? String(c.checkedChar) : '☑'
  const off = c?.uncheckedChar != null && String(c.uncheckedChar) !== '' ? String(c.uncheckedChar) : '☐'
  if (rowIsEmpty(row)) return off
  if (!c?.binding) return off
  const v = row[c.binding]
  if (c.checkedValue != null && String(c.checkedValue) !== '') {
    return String(v).trim() === String(c.checkedValue).trim() ? on : off
  }
  return isTruthyField(v) ? on : off
}
