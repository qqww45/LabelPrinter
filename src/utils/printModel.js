/**
 * 打印展开：按行份数、整单份数、序号，以及「空了就不印」。
 * 纯函数。预览、系统打印、矢量 PDF、热敏指令共用同一份结果，避免各算各的。
 */
import dayjs from 'dayjs'
import { codePayload, renderText, rowIsEmpty } from './render.js'
import { formatCheckboxText, formatSerialText } from './controls.js'
import { normalizeMargin } from './pageBox.js'

const MAX_COPIES = 999

function clampCopies(n, min) {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v)) return min
  return Math.min(MAX_COPIES, Math.max(min, v))
}

/** 这一行打几张。指定了份数列时用格子里的数（小于 1 跳过）；没指定就先按 1，整单份数在外面乘。 */
export function rowRepeatCount(row, copiesColumn) {
  if (!copiesColumn) return 1
  const raw = row?.[copiesColumn]
  if (raw == null || String(raw).trim() === '') return 1
  const n = Number(raw)
  if (!Number.isFinite(n)) return 1
  return clampCopies(n, 0)
}

/**
 * 把数据行展开成「实际要打的每一张」。
 * 不改原行。没有数据时只留一张空标签，好让版式上的占位符还看得见。
 * copies：没选份数列时，整单重复。collate 为 true 时按套重复（1,2,3,1,2,3），否则每条连打。
 * 没勾选逐份时按每条连打，和原来系统打印的默认顺序一致。
 * serialEnabled 时写入「序号」，从 serialStart 起每张加 1。
 */
export function expandPrintLabels(rows, opts = {}) {
  const copies = clampCopies(opts.copies ?? 1, 1)
  const copiesColumn = opts.copiesColumn || ''
  const serialOn = !!opts.serialEnabled
  const serialRaw = Math.floor(Number(opts.serialStart ?? 1))
  const serialStart = Number.isFinite(serialRaw) ? Math.max(0, serialRaw) : 1
  const collate = !!opts.collate
  const list = Array.isArray(rows) ? rows.filter(r => r && typeof r === 'object') : []

  if (!list.length) {
    return [{ row: {}, serial: null, copyIndex: 0, index: 0 }]
  }

  const base = []
  list.forEach((row, sourceIndex) => {
    const n = rowRepeatCount(row, copiesColumn)
    for (let copyIndex = 0; copyIndex < n; copyIndex++) {
      base.push({ row, copyIndex, sourceIndex })
    }
  })

  const jobCopies = copiesColumn ? 1 : copies
  let seq = base
  if (jobCopies > 1 && base.length) {
    seq = []
    if (collate) {
      for (let c = 0; c < jobCopies; c++) {
        for (const item of base) seq.push({ ...item })
      }
    } else {
      for (const item of base) {
        for (let c = 0; c < jobCopies; c++) seq.push({ ...item })
      }
    }
  }

  let serial = serialStart
  return seq.map((item, index) => {
    const row = { ...item.row }
    let serialNo = null
    if (serialOn) {
      serialNo = serial
      row['序号'] = String(serial)
      serial += 1
    }
    return { row, serial: serialNo, copyIndex: item.copyIndex, index }
  })
}

/** 按每页标签数切页。空位 empty=true，调用方不画组件。 */
export function paginateLabels(labels, perPage) {
  const per = clampCopies(perPage ?? 1, 1)
  const list = Array.isArray(labels) ? labels : []
  if (!list.length) {
    return [{
      slots: Array.from({ length: per }, (_, j) => ({ row: {}, empty: true, index: j }))
    }]
  }
  const pages = []
  for (let i = 0; i < list.length; i += per) {
    const slots = []
    for (let j = 0; j < per; j++) {
      const item = list[i + j]
      if (item) slots.push({ ...item, empty: false })
      else slots.push({ row: {}, empty: true, index: i + j })
    }
    pages.push({ slots })
  }
  return pages
}

/**
 * 勾了「内容为空时不打印」才可能藏起来。
 * 还没有数据行时不藏，画布上要留着排版。
 */
export function componentHidden(c, row) {
  if (c?.hidden) return true
  if (!c?.hideIfEmpty) return false
  if (rowIsEmpty(row)) return false
  if (c.type === 'date' && c.source !== 'field') return false
  if (c.type === 'serial' && c.source !== 'field') {
    return !String(formatSerialText(c, row) || '').trim()
  }
  if (c.type === 'checkbox') {
    // 未绑定字段时始终显示空框；绑定后空值才可能隐藏
    if (!c.binding) return false
    const v = row[c.binding]
    return v == null || String(v).trim() === ''
  }
  if (c.binding) {
    const v = row[c.binding]
    return v == null || String(v).trim() === ''
  }
  if (c.type === 'text' && String(c.text || '').includes('{{')) {
    return String(renderText(c.text, row)).trim() === ''
  }
  if (c.type === 'qrcode' || c.type === 'barcode') return !codePayload(c, row)
  return false
}

/** 组件上要印出来的纯文本。二维码/条码返回编码内容。 */
export function componentPlainText(c, row) {
  if (!c) return ''
  if (c.type === 'date') {
    if (c.source === 'field') {
      if (!row?.[c.binding]) return ''
      return dayjs(row[c.binding]).format(c.format || 'YYYY-MM-DD')
    }
    return dayjs().format(c.format || 'YYYY-MM-DD HH:mm:ss')
  }
  if (c.type === 'serial') return formatSerialText(c, row)
  if (c.type === 'checkbox') return formatCheckboxText(c, row)
  if (c.type === 'qrcode' || c.type === 'barcode') return codePayload(c, row)
  if (c.type === 'text') return renderText(c.text || '', row)
  return ''
}

/** 第 index 个标签在纸上的左上角（毫米），和预览的分栏一致。 */
export function slotOffsetMm(index, { label, margin, layout } = {}) {
  const m = normalizeMargin(margin)
  const lw = Number(label?.width) || 0
  const lh = Number(label?.height) || 0
  const L = layout || {}
  const cols = L.cols || 1
  const rows = L.rows || 1
  const left = m.left
  const top = m.top
  if (L.mode !== 'auto' || (cols <= 1 && rows <= 1)) {
    return { x: left, y: top, w: lw, h: lh }
  }
  const col = index % cols
  const row = Math.floor(index / cols)
  return {
    x: left + col * (lw + (Number(L.hGap) || 0)),
    y: top + row * (lh + (Number(L.vGap) || 0)),
    w: lw,
    h: lh
  }
}
