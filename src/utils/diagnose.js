/**
 * 设计体检（Preflight）：集中检测「会导致打出来空白 / 不对」的问题。
 *
 * 三处共用，保证口径一致：
 *   1) 画布设计态提示（DesignCanvas）—— 让问题元素自己“喊出来”
 *   2) 属性面板即时预警（PropertyPanel）—— 选中的组件当场校验
 *   3) 打印 / 导出前体检（PreflightCheckDialog）—— 动手前先看清楚
 *
 * 纯函数、无副作用，方便单测。
 */
import { expandPrintLabels, componentHidden } from './printModel.js'
import { normalizeMargin } from './pageBox.js'
import { codePayload, isEncodableCode, resolveRow } from './render.js'

/**
 * 单个组件引用到的所有字段名：
 * - binding（绑定字段）
 * - 文本里的 {{占位符}}
 * - 表格各单元格的 binding 与 {{占位符}}
 */
export function componentFields(c) {
  const set = new Set()
  if (!c) return []
  if (c.binding) set.add(c.binding)
  const scan = (text) => {
    if (typeof text !== 'string') return
    const re = /\{\{([^}]+)\}\}/g
    let m
    while ((m = re.exec(text))) {
      const k = m[1].trim()
      if (k) set.add(k)
    }
  }
  scan(c.text)
  if (c.type === 'table' && c.cells) {
    for (const cell of Object.values(c.cells)) {
      if (!cell) continue
      if (cell.binding) set.add(cell.binding)
      scan(cell.text)
    }
  }
  return Array.from(set)
}

/**
 * 可用字段集合 = 数据源列名 ∪「已成功映射」的模板字段名
 * （resolveRow 会把映射源的值填进模板字段名，所以映射成功的也算可用）
 */
export function availableFields(dataFields = [], fieldMap = {}) {
  const s = new Set(dataFields)
  for (const [tpl, src] of Object.entries(fieldMap || {})) {
    if (src && dataFields.includes(src)) s.add(tpl)
  }
  return s
}

/**
 * 单个组件里「数据里找不到」的字段
 * 数据源为空时一律返回空数组 —— 那种情况由 no-data 单独提示，避免全线误报
 */
export function componentMissingFields(c, avail) {
  if (!avail || !avail.size) return []
  return componentFields(c).filter(f => !avail.has(f))
}

/**
 * 按组件汇总缺失字段（数据源为空时返回空数组）
 * @returns {Array<{id:string,name:string,fields:string[]}>}
 */
export function missingFieldsByComponent(components = [], dataFields = [], fieldMap = {}) {
  if (!dataFields.length) return []
  const avail = availableFields(dataFields, fieldMap)
  const out = []
  for (const c of components) {
    const miss = componentMissingFields(c, avail)
    if (miss.length) out.push({ id: c.id, name: c.name || c.type, fields: miss })
  }
  return out
}

/**
 * 元素超出标签边界检测
 * 文本组件的高度由内容撑开（Textbox 自适应），故不判断底边，避免误报
 */
export function findOutOfBounds(components = [], label = {}) {
  const W = Number(label?.width) || 0
  const H = Number(label?.height) || 0
  if (!W || !H) return []
  const TOL = 0.6 // mm，容忍取整误差
  const out = []
  for (const c of components) {
    const x = Number(c.left) || 0
    const y = Number(c.top) || 0
    const w = Number(c.width) || 0
    const h = Number(c.height) || 0
    const reasons = []
    if (x < -TOL) reasons.push('left')
    if (y < -TOL) reasons.push('top')
    if (w > 0 && x + w > W + TOL) reasons.push('right')
    // 文本类高度常随内容变化，底边不判越界（与 text 一致）
    const softBottom = c.type === 'text' || c.type === 'date' || c.type === 'serial' || c.type === 'checkbox'
    if (!softBottom && h > 0 && y + h > H + TOL) reasons.push('bottom')
    if (reasons.length) {
      out.push({
        id: c.id,
        name: c.name || c.type,
        reasons,
        overflowRight: w > 0 ? Math.max(0, x + w - W) : 0,
        overflowBottom: (!softBottom && h > 0) ? Math.max(0, y + h - H) : 0
      })
    }
  }
  return out
}

/**
 * 全量体检
 * @returns {{ issues:Array, errors:Array, warnings:Array, hasError:boolean, summary:object }}
 */
export function runDiagnostics({
  components = [],
  dataFields = [],
  fieldMap = {},
  rowCount = 0,
  label = {},
  paper = {},
  perPage = 1,
  printConfig = {},
  rows
} = {}) {
  const issues = []

  // ① 画布为空 —— 打出来必然空白
  if (!components.length) {
    issues.push({
      level: 'error',
      code: 'empty-canvas',
      title: '画布上还没有任何元素',
      detail: '现在打印只会得到一张空白标签。请从左侧组件面板拖入文字、条码、表格等元素。',
      fix: 'none'
    })
  }

  // ② 字段对不上 —— 最致命的「静默变空白」
  const missComp = missingFieldsByComponent(components, dataFields, fieldMap)
  if (missComp.length) {
    const fields = [...new Set(missComp.flatMap(m => m.fields))]
    issues.push({
      level: 'error',
      code: 'missing-fields',
      title: `${fields.length} 个字段在数据里找不到`,
      detail: `这些位置会显示 ⚠ 标记或空白：${fields.map(f => `「${f}」`).join('、')}。可用「字段映射」把它们对应到真实的列名。`,
      fix: 'field-map',
      ids: missComp.map(m => m.id),
      fields
    })
  }

  // ③ 元素越界 —— 打印被裁切
  const oob = findOutOfBounds(components, label)
  if (oob.length) {
    issues.push({
      level: 'warn',
      code: 'out-of-bounds',
      title: `${oob.length} 个元素超出标签范围`,
      detail: '超出标签的部分不会被打印出来。建议把它们移回标签内，或调整标签尺寸。',
      fix: 'select',
      ids: oob.map(o => o.id)
    })
  }

  // ④ 绑定了条码/二维码，但有的行是空的
  if (Array.isArray(rows) && rows.length) {
    const codes = components.filter(c => c && (c.type === 'barcode' || c.type === 'qrcode'))
    const hits = []
    if (codes.length) {
      rows.forEach((row, i) => {
        const resolved = resolveRow(row, fieldMap)
        for (const c of codes) {
          if (componentHidden(c, resolved)) continue
          if (!isEncodableCode(codePayload(c, resolved))) {
            hits.push({ rowIndex: i, id: c.id })
            break
          }
        }
      })
    }
    if (hits.length) {
      const shown = hits.slice(0, 6).map(h => h.rowIndex + 1).join('、')
      const more = hits.length > 6 ? '…' : ''
      issues.push({
        level: 'warn',
        code: 'empty-code',
        title: `${hits.length} 行的条码或二维码是空的`,
        detail: `第 ${shown}${more} 行打出来扫不了。`,
        fix: 'row',
        rowIndex: hits[0].rowIndex,
        ids: [hits[0].id]
      })
    }
  }

  // ⑤ 没有数据 —— 只出一张标签
  if (!rowCount) {
    issues.push({
      level: 'warn',
      code: 'no-data',
      title: '还没有数据',
      detail: '将只能打印 1 张（固定文字仍会输出，字段位置为空白）。导入 Excel / CSV 后即可批量打印。',
      fix: 'import'
    })
  }

  const errors = issues.filter(i => i.level === 'error')
  const warnings = issues.filter(i => i.level === 'warn')
  const safePerPage = Math.max(1, Number(perPage) || 1)
  const copies = Math.max(1, Number(printConfig?.copies) || 1)
  // 传入数据行时，页数按展开后的张数算（份数、按列份数已经乘进去），界面不再另乘一次
  let pages = rowCount ? Math.max(1, Math.ceil(rowCount / safePerPage)) : 1
  let copiesShown = copies
  if (Array.isArray(rows)) {
    const n = rows.length ? expandPrintLabels(rows, printConfig).length : 0
    pages = n ? Math.max(1, Math.ceil(n / safePerPage)) : 1
    copiesShown = 1
  }

  return {
    issues,
    errors,
    warnings,
    hasError: errors.length > 0,
    summary: {
      labelText: (label.width && label.height) ? `${label.width}×${label.height}mm` : '—',
      paperText: (paper.width && paper.height) ? `${paper.width}×${paper.height}mm` : '—',
      rowCount,
      perPage: safePerPage,
      pages,
      copies: copiesShown,
      totalSheets: pages * copiesShown
    }
  }
}

/**
 * 当前排版在纸张可印区域内是否放得下（mm）。
 * auto 网格：cols×rows 标签 + 间隙；single：单枚标签。
 */
export function layoutFitsPaper({ paper = {}, margin = {}, label = {}, layout = {} } = {}) {
  const pw = Number(paper.width) || 0
  const ph = Number(paper.height) || 0
  const m = normalizeMargin(margin)
  const ml = m.left
  const mr = m.right
  const mt = m.top
  const mb = m.bottom
  const lw = Number(label.width) || 0
  const lh = Number(label.height) || 0
  const contentW = Math.max(0, pw - ml - mr)
  const contentH = Math.max(0, ph - mt - mb)
  const mode = layout.mode || 'single'
  const cols = Math.max(1, Number(layout.cols) || 1)
  const rows = Math.max(1, Number(layout.rows) || 1)
  const hGap = Number(layout.hGap) || 0
  const vGap = Number(layout.vGap) || 0
  let neededW = lw
  let neededH = lh
  if (mode === 'auto' && (cols > 1 || rows > 1)) {
    neededW = cols * lw + (cols - 1) * hGap
    neededH = rows * lh + (rows - 1) * vGap
  }
  const overflowW = Math.max(0, Math.round((neededW - contentW) * 10) / 10)
  const overflowH = Math.max(0, Math.round((neededH - contentH) * 10) / 10)
  return {
    contentW: Math.round(contentW * 10) / 10,
    contentH: Math.round(contentH * 10) / 10,
    neededW: Math.round(neededW * 10) / 10,
    neededH: Math.round(neededH * 10) / 10,
    overflowW,
    overflowH,
    fits: overflowW <= 0.05 && overflowH <= 0.05
  }
}

function mediaLabel(media) {
  if (media === 'mark') return '黑标'
  if (media === 'continuous') return '连续纸'
  if (media === 'gap') return '间隙纸'
  return ''
}

/**
 * 打印预览顶栏摘要：纸张/标签/份数/页数 + 警报（含排版能否放进纸张）。
 */
export function buildPreviewBrief({
  components = [],
  dataFields = [],
  fieldMap = {},
  rows = [],
  label = {},
  paper = {},
  margin = {},
  layout = {},
  printConfig = {},
  perPage = 1,
  labelCount = 0,
  pageCount = 0
} = {}) {
  const rowCount = Array.isArray(rows) ? rows.length : 0
  const safePerPage = Math.max(1, Number(perPage) || 1)
  const cfg = printConfig || {}
  const copies = Math.max(1, Number(cfg.copies) || 1)
  const copiesColumn = String(cfg.copiesColumn || '').trim()
  const diag = runDiagnostics({
    components,
    dataFields,
    fieldMap,
    rowCount,
    label,
    paper,
    perPage: safePerPage,
    printConfig: cfg,
    rows
  })
  const fit = layoutFitsPaper({ paper, margin, label, layout })
  const alerts = [...diag.issues]

  if (!fit.fits) {
    const bits = []
    if (fit.overflowW > 0) bits.push(`横向超出约 ${fit.overflowW} mm`)
    if (fit.overflowH > 0) bits.push(`纵向超出约 ${fit.overflowH} mm`)
    alerts.unshift({
      level: 'error',
      code: 'layout-overflow',
      title: '排版放不进当前纸张',
      detail: `可印区域 ${fit.contentW}×${fit.contentH} mm，当前排版需要 ${fit.neededW}×${fit.neededH} mm。${bits.join('，')}。超出部分会被裁切。`,
      fix: 'none'
    })
  }

  const pages = Math.max(1, Number(pageCount) || diag.summary.pages || 1)
  const labels = Math.max(0, Number(labelCount) || 0)
  if (pages >= 80) {
    alerts.push({
      level: 'warn',
      code: 'many-pages',
      title: '将输出较多页',
      detail: `约 ${pages} 页。页数较多，建议先打 1～2 页核对位置，再整批打印。`,
      fix: 'none'
    })
  }

  if (copiesColumn && rowCount) {
    alerts.push({
      level: 'warn',
      code: 'copies-column',
      title: '按列决定份数',
      detail: `按列「${copiesColumn}」已展开为 ${labels} 张标签、约 ${pages} 页。请确认该列数值正确，小于 1 的行会跳过。`,
      fix: 'none'
    })
  } else if (copies > 1 && rowCount) {
    alerts.push({
      level: 'warn',
      code: 'multi-copies',
      title: '整单多份已计入张数',
      detail: `整单 ${copies} 份：数据 ${rowCount} 条 → ${labels} 张标签、约 ${pages} 页（预览与打印按展开后的张数输出）。`,
      fix: 'none'
    })
  }

  const layoutMode = layout.mode || 'single'
  const layoutText = layoutMode === 'auto'
    ? `${Math.max(1, layout.cols || 1)}×${Math.max(1, layout.rows || 1)}`
    : '单张'
  const marginText = `${Number(margin.top) || 0}/${Number(margin.right) || 0}/${Number(margin.bottom) || 0}/${Number(margin.left) || 0}`
  const media = mediaLabel(cfg.media)
  const dpi = Number(cfg.dpi) === 300 ? 300 : (Number(cfg.dpi) === 203 ? 203 : 0)

  const facts = [
    { key: 'paper', label: '纸张', value: diag.summary.paperText },
    { key: 'label', label: '标签', value: diag.summary.labelText },
    { key: 'margin', label: '边距(上右下左)', value: `${marginText} mm` },
    { key: 'layout', label: '排版', value: `${layoutText} · 每页 ${safePerPage} 枚` },
    { key: 'data', label: '数据', value: `${rowCount} 条` },
    { key: 'labels', label: '将打标签', value: `${labels} 张` },
    { key: 'pages', label: '将出纸', value: `${pages} 页` },
    {
      key: 'copies',
      label: '份数',
      value: copiesColumn ? `按列「${copiesColumn}」` : `${copies}`
    }
  ]
  if (media) {
    facts.push({
      key: 'media',
      label: '热敏',
      value: dpi ? `${media} · ${dpi} dpi` : media
    })
  }

  const errors = alerts.filter((i) => i.level === 'error')
  const warnings = alerts.filter((i) => i.level === 'warn')
  return {
    facts,
    alerts,
    errors,
    warnings,
    hasError: errors.length > 0,
    fit,
    summary: {
      ...diag.summary,
      pages,
      labelCount: labels,
      layoutText,
      marginText,
      copiesText: copiesColumn ? `按列「${copiesColumn}」` : String(copies)
    }
  }
}
