/**
 * 一整页规格：纸张、标签、边距、间隙一起写上。
 * 行列用和项目里相同的算法，避免选完又被自动排版改掉。
 */

export function gridForSheet({ paper = {}, label = {}, margin = 0, hGap = 0, vGap = 0 } = {}) {
  const m = Number(margin) || 0
  const aw = (Number(paper.width) || 0) - m - m
  const ah = (Number(paper.height) || 0) - m - m
  const lw = Math.max(1, Number(label.width) || 1)
  const lh = Math.max(1, Number(label.height) || 1)
  const hg = Math.max(0, Number(hGap) || 0)
  const vg = Math.max(0, Number(vGap) || 0)
  return {
    cols: Math.max(1, Math.floor((aw + hg) / (lw + hg))),
    rows: Math.max(1, Math.floor((ah + vg) / (lh + vg)))
  }
}

function sheet(name, paperW, paperH, labelW, labelH, margin, hGap, vGap, mode) {
  return { name, paper: { width: paperW, height: paperH }, label: { width: labelW, height: labelH }, margin, hGap, vGap, mode }
}

/** 只用已经在用的毫米尺寸，不编包装编号。 */
export const SHEET_PRESETS = Object.freeze([
  sheet('A4 · 40×30', 210, 297, 40, 30, 3, 2, 2, 'auto'),
  sheet('A4 · 50×30', 210, 297, 50, 30, 3, 2, 2, 'auto'),
  sheet('A4 · 60×40', 210, 297, 60, 40, 3, 2, 2, 'auto'),
  sheet('A4 · 80×50', 210, 297, 80, 50, 3, 2, 2, 'auto'),
  sheet('A4 · 100×50', 210, 297, 100, 50, 3, 2, 2, 'auto'),
  sheet('A4 · 100×70', 210, 297, 100, 70, 3, 2, 2, 'auto'),
  sheet('单张 50×30', 50, 30, 50, 30, 0, 0, 0, 'single'),
  sheet('单张 60×40', 60, 40, 60, 40, 0, 0, 0, 'single'),
  sheet('单张 100×50', 100, 50, 100, 50, 0, 0, 0, 'single'),
  sheet('单张 100×150', 100, 150, 100, 150, 0, 0, 0, 'single')
])

export function sheetPresetPatch(preset) {
  if (!preset) return null
  const margin = {
    top: preset.margin,
    right: preset.margin,
    bottom: preset.margin,
    left: preset.margin
  }
  if (preset.mode === 'single') {
    return {
      paper: { ...preset.paper },
      label: { ...preset.label },
      margin,
      layout: { mode: 'single', sizingMode: 'auto', cols: 1, rows: 1, hGap: 0, vGap: 0 }
    }
  }
  const grid = gridForSheet(preset)
  return {
    paper: { ...preset.paper },
    label: { ...preset.label },
    margin,
    layout: {
      mode: 'auto',
      sizingMode: 'auto',
      cols: grid.cols,
      rows: grid.rows,
      hGap: preset.hGap,
      vGap: preset.vGap
    }
  }
}
