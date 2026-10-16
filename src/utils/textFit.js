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
