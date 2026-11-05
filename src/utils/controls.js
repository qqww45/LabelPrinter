/**
 * 新增控件（序号 / 勾选框）的纯展示逻辑。
 * 画布、预览、PDF、热敏指令共用，避免各算各的。
 */
import { rowIsEmpty } from './render.js'

/** 有数据但价格为空/非法时的占位 */
export const EMPTY_PRICE_DISPLAY = '—'

function parsePriceNumber(v) {
  if (v == null || String(v).trim() === '') return null
  const n = Number(String(v).replace(/[,¥￥$\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * 价格控件展示文案。
 * 无数据行：样例价便于排版；有行无值/非法： em dash。
 */
export function formatPriceText(c, row) {
  const currency = c?.currency != null ? String(c.currency) : '¥'
  const decimalsRaw = Math.floor(Number(c?.decimals))
  const decimals = Number.isFinite(decimalsRaw) ? Math.max(0, Math.min(8, decimalsRaw)) : 2
  const prefix = c?.prefix != null ? String(c.prefix) : ''
  const suffix = c?.suffix != null ? String(c.suffix) : ''

  if (rowIsEmpty(row)) {
    return prefix + currency + (12.8).toFixed(decimals) + suffix
  }
  if (!c?.binding) return EMPTY_PRICE_DISPLAY
  const v = row[c.binding]
  if (v == null || String(v).trim() === '') return EMPTY_PRICE_DISPLAY
  const n = parsePriceNumber(v)
  if (n == null) return EMPTY_PRICE_DISPLAY
  return prefix + currency + n.toFixed(decimals) + suffix
}

/** Fabric / PDF 共用：solid → null，dashed/dotted → 数组 */
export function strokeStyleDash(strokeStyle) {
  const s = String(strokeStyle || 'solid').toLowerCase()
  if (s === 'dashed') return [6, 4]
  if (s === 'dotted') return [2, 3]
  return null
}

export function applyPdfLineDash(pdf, strokeStyle) {
  const dash = strokeStyleDash(strokeStyle)
  if (typeof pdf.setLineDashPattern === 'function') {
    pdf.setLineDashPattern(dash || [], 0)
  }
}

/** 分隔线端点（mm，相对组件框左上角） */
export function dividerEndpoints(c, x, y, w, h) {
  const vertical = c?.direction === 'vertical'
  if (vertical) {
    const cx = x + w / 2
    return { x1: cx, y1: y, x2: cx, y2: y + h }
  }
  const cy = y + h / 2
  return { x1: x, y1: cy, x2: x + w, y2: cy }
}

/** 条形码 canvas 选项（displayValue 默认 true，兼容旧模板） */
export function barcodeCanvasOptions(c, targetWidth, targetHeight) {
  return {
    format: c?.format || 'CODE128',
    textRatio: c?.textRatio,
    displayValue: c?.displayValue !== false,
    targetWidth,
    targetHeight
  }
}

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
  const startRaw = Math.floor(Number(c?.start ?? c?.serialStart ?? 1))
  const start = Number.isFinite(startRaw) ? startRaw : 1
  const stepRaw = Number(c?.step ?? c?.serialStep ?? 1)
  const step = Number.isFinite(stepRaw) && stepRaw !== 0 ? stepRaw : 1

  let raw = ''
  if (rowIsEmpty(row)) {
    raw = String(Math.max(0, start))
  } else if (c?.source === 'field') {
    const v = row?.[c.binding]
    if (v == null || String(v).trim() === '') return ''
    raw = String(v).trim()
  } else if (c?.source === 'sequence') {
    const scope = c?.sequenceScope === 'row' ? 'row' : 'label'
    const base = scope === 'row'
      ? Math.floor(Number(row?.__sourceIndex ?? 0))
      : Math.floor(Number(row?.__labelIndex ?? 0))
    const n = start + base * step
    raw = String(n)
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
