/**
 * 预览 / 打印 / PNG 共用的纸张盒样式（纯函数）。
 *
 * 纸张边距必须落在 page 的 padding 上（配合 box-sizing:border-box），
 * 不要用内部 .label 的 marginTop/marginLeft：html2canvas 对子元素上边距
 * 经常裁切或叠边，会导致导出 PNG 上边距比预览/PDF 窄。
 */

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 负边距收成 0。CSS 会丢掉负 padding，PDF 若仍按负数平移，预览和 PDF 就会错位。 */
function side(v) {
  return Math.max(0, num(v))
}

/** @returns {{ top:number, right:number, bottom:number, left:number }} */
export function normalizeMargin(margin = {}) {
  return {
    top: side(margin.top),
    right: side(margin.right),
    bottom: side(margin.bottom),
    left: side(margin.left)
  }
}

/**
 * 标签区尺寸（mm）= 纸张 − 四边边距
 * @returns {{ width:number, height:number }}
 */
export function labelAreaMm(paper = {}, margin = {}) {
  const m = normalizeMargin(margin)
  return {
    width: Math.max(0, num(paper.width) - m.left - m.right),
    height: Math.max(0, num(paper.height) - m.top - m.bottom)
  }
}

/**
 * 整页纸张盒样式（px）。宽高为物理纸张，边距为 padding。
 * @param {number} pxPerMm 每毫米像素（含预览缩放）
 * @param {object} [extras] 额外样式（如 background、boxShadow）
 */
export function pageBoxStyle(paper = {}, margin = {}, pxPerMm = 0, extras = {}) {
  const m = normalizeMargin(margin)
  const s = num(pxPerMm)
  return {
    width: num(paper.width) * s + 'px',
    height: num(paper.height) * s + 'px',
    boxSizing: 'border-box',
    paddingTop: m.top * s + 'px',
    paddingRight: m.right * s + 'px',
    paddingBottom: m.bottom * s + 'px',
    paddingLeft: m.left * s + 'px',
    overflow: 'hidden',
    ...extras
  }
}

/**
 * 标签区样式（px）。不再设置 margin，尺寸 = 纸张内容区。
 */
export function labelAreaStyle(paper = {}, margin = {}, pxPerMm = 0, extras = {}) {
  const area = labelAreaMm(paper, margin)
  const s = num(pxPerMm)
  return {
    position: 'relative',
    width: area.width * s + 'px',
    height: area.height * s + 'px',
    margin: '0',
    overflow: 'hidden',
    ...extras
  }
}
