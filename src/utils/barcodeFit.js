/** 左右各留的空白，按「一根条」来计。 */
export const BARCODE_QUIET_MODULES = 2

/** 打印用的像素密度。条码按这个尺寸画，放进毫米格子时不再被拉糊。 */
export function barcodePrintPx(mm) {
  return Math.max(1, Math.round((Number(mm) || 0) * 300 / 25.4))
}

/**
 * 一根条占几个像素。短内容模块少，格子又宽时，条要画粗，不能靠事后放大。
 * 没有目标宽度时保持原来的 2px。
 */
export function barcodeModuleWidth(moduleCount, targetWidth, quietModules = BARCODE_QUIET_MODULES) {
  const modules = Math.max(1, Math.round(Number(moduleCount) || 1))
  const target = Math.round(Number(targetWidth) || 0)
  if (target <= 0) return 2
  const span = modules + Math.max(0, quietModules) * 2
  return Math.max(1, Math.round(target / span))
}

/** 条码下方的数字，按格子高度来，避免画成很小再被拉糊。 */
export function barcodeFontSize(targetHeight) {
  const h = Math.round(Number(targetHeight) || 0)
  if (h <= 0) return 14
  return Math.max(12, Math.min(64, Math.round(h * 0.22)))
}

/** 条的高度（像素）。把数字和左右空白从格子高度里扣掉。 */
export function barcodeBarHeight(targetHeight, fontSize, moduleWidth, showText = true) {
  const h = Math.round(Number(targetHeight) || 0)
  const mw = Math.max(1, Number(moduleWidth) || 2)
  const margin = mw * BARCODE_QUIET_MODULES
  if (h <= 0) return 60
  if (!showText) return Math.max(8, h - margin * 2)
  const textBlock = Math.max(1, Number(fontSize) || 14) + mw
  return Math.max(8, h - textBlock - margin * 2)
}
