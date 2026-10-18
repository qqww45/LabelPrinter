import { MM_TO_PX } from './canvasFit.js'

/** 和预览 CSS 的 line-height 对齐。 */
export const TEXT_LINE_HEIGHT = 1.2

/**
 * 一行字至少要占的高度（mm）。
 * 字号按像素计，框按毫米计；再留一截下沿，避免中文和数字被裁掉底部。
 */
export function minTextHeightMm(fontSize, lines = 1, mmToPx = MM_TO_PX) {
  const size = Math.max(1, Number(fontSize) || 12)
  const n = Math.max(1, Math.floor(Number(lines) || 1))
  const inkPx = size * TEXT_LINE_HEIGHT * n + Math.max(2, size * 0.15)
  return Math.round((inkPx / mmToPx) * 100) / 100
}

/** 字号变大时，框若比一行字还矮，就加高到能放下整行。已经更高的框不动。 */
export function heightForFont(currentHeight, fontSize, lines = 1) {
  const min = minTextHeightMm(fontSize, lines)
  const cur = Number(currentHeight) || 0
  return cur + 0.05 < min ? min : cur
}

function charWidthPx(ch, fontSize) {
  const c = ch.codePointAt(0) || 0
  if (c > 0xff) return fontSize
  return fontSize * 0.55
}

/** 按预览的折行方式估算：字被格子裁掉时返回 true。空字不算。 */
export function textOverflowsBox(text, { fontSize = 14, widthMm = 0, heightMm = 0 } = {}) {
  const raw = String(text ?? '')
  if (!raw.trim()) return false
  const size = Math.max(1, Number(fontSize) || 14)
  const widthPx = Math.max(0, Number(widthMm) || 0) * MM_TO_PX
  const height = Number(heightMm) || 0
  if (widthPx <= 0 || height <= 0) return false
  let lines = 0
  for (const part of raw.split('\n')) {
    if (!part) {
      lines += 1
      continue
    }
    let used = 0
    let count = 0
    let rowLines = 1
    for (const ch of part) {
      const w = charWidthPx(ch, size)
      if (used + w > widthPx + 0.01 && count > 0) {
        rowLines += 1
        used = 0
        count = 0
      }
      used += w
      count += 1
    }
    lines += rowLines
  }
  return minTextHeightMm(size, Math.max(1, lines)) > height + 0.05
}
