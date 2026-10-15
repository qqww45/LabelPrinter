/**
 * 视图缩放工具：让标签画布"适合窗口"
 * Toolbar 的 ⛶ 适合窗口按钮 + DesignCanvas 初始加载/resize 自动适配共用
 */
export const MM_TO_PX = 96 / 25.4

/**
 * 计算让画布铺满可视区的 zoom 值
 * @param {HTMLElement} wrapEl 画布滚动容器
 * @param {number} labelWmm 标签宽 mm
 * @param {number} labelHmm 标签高 mm
 * @returns {number|null} zoom 值；容器不可用时返回 null
 */
export function fitZoomToWindow(wrapEl, labelWmm, labelHmm) {
  if (!wrapEl) return null
  const pad = 40
  const w = wrapEl.clientWidth - pad * 2
  const h = wrapEl.clientHeight - pad * 2
  if (w <= 0 || h <= 0) return null
  const fitW = w / (labelWmm * MM_TO_PX)
  const fitH = h / (labelHmm * MM_TO_PX)
  return Math.max(0.2, Math.min(4, Math.min(fitW, fitH)))
}
