<template>
  <div class="design-canvas-root">
    <div class="design-canvas-wrap" ref="wrapRef">
      <!-- 标签画布：只显示一个标签（数据单元） -->
      <div class="label-canvas-wrapper" :style="canvasWrapperStyle">
        <canvas ref="canvasRef"></canvas>
        <!-- 标签边框 overlay：不能用 wrapper border（fabric canvas 会盖住右/下边） -->
        <div v-if="pj.project.label.showBorder" class="label-border-overlay"
             :style="labelBorderOverlayStyle"></div>
        <!-- 空画布引导：首拖即消失；pointer-events:none 不挡拖放 -->
        <div v-if="!pj.project.components.length" class="canvas-empty" aria-hidden="true">
          <div class="canvas-empty-title">{{ t('还没有组件') }}</div>
          <div class="canvas-empty-sub">{{ t('下一步：从左侧拖入文字、条码或二维码') }}</div>
        </div>
      </div>

      <!-- 纸张 · 当前数据行 · 本页张数（文案在 computed，避免模板里 {n} 被解析器误伤） -->
      <div class="info-bar" :title="infoBarTitle">
        <span>{{ paperHint }}</span>
        <span v-if="data.displayRows.length" class="info-row">{{ rowHint }}</span>
        <span v-else class="info-muted">{{ t('无数据') }}</span>
        <span v-if="labelsPerPage > 1">{{ pageHint }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onBeforeUnmount, nextTick } from 'vue'
import * as fabric from 'fabric'

// Fabric 7 默认原点改为 center/center；本应用按 left/top 定位，保持与 v6 一致
fabric.FabricObject.ownDefaults.originX = 'left'
fabric.FabricObject.ownDefaults.originY = 'top'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { resolveRow, renderTextWithAlert, codePayload, rowIsEmpty, isEncodableCode, rewriteBindingText, collectBindingTextFixes } from '../utils/render'
import { formatCheckboxText, formatSerialText } from '../utils/controls'
import { availableFields, componentMissingFields } from '../utils/diagnose'
import { generateQRCode } from '../utils/qrcode'
import { generateBarcode } from '../utils/barcode'
import { qrToCanvas, barcodeToCanvas, canvasToDataURL } from '../utils/cellImage'
import { fitZoomToWindow } from '../utils/canvasFit'
import { useI18n } from '../utils/i18n'
import { safeImageSrc } from '../utils/escapeHtml'
import dayjs from 'dayjs'

// 1mm = 3.7795275591 px (按 96dpi)
const MM_TO_PX = 96 / 25.4

const wrapRef = ref(null)
const canvasRef = ref(null)
let fabricCanvas = null

const pj = useProjectStore()
const data = useDataStore()
const { t } = useI18n()

const labelsPerPage = computed(() => {
  const L = pj.project.layout || {}
  if (L.mode === 'auto') return Math.max(1, (L.cols || 1) * (L.rows || 1))
  return 1
})
const paperHint = computed(() =>
  `${t('纸张')} ${pj.project.paper.width}×${pj.project.paper.height} mm`
)
const rowHint = computed(() =>
  t('第 {i} / {n} 行', { i: data.activeRowIndex + 1, n: data.displayRows.length })
)
const pageHint = computed(() => t('{n} 张/页', { n: labelsPerPage.value }))
const infoBarTitle = computed(() => {
  const parts = [paperHint.value]
  if (data.displayRows.length) parts.push(rowHint.value)
  else parts.push(t('无数据'))
  if (labelsPerPage.value > 1) parts.push(pageHint.value)
  return parts.join(' · ')
})

// 可用字段集合（数据源列名 + 已成功映射的模板字段名）
// 用于设计态提示「字段在数据里不存在」——数据为空时集合为空，此时不提示（另有“没有数据”引导）
const availFieldSet = computed(() => availableFields(data.fields, pj.project.dataSource.fieldMap))

// 画布 = 单个标签大小
const canvasWrapperStyle = computed(() => ({
  width: (pj.project.label.width * MM_TO_PX * pj.zoom) + 'px',
  height: (pj.project.label.height * MM_TO_PX * pj.zoom) + 'px',
  background: pj.project.label.backgroundColor || '#fff'
}))

// 标签边框 overlay（覆盖在 fabric canvas 之上，四边完整可见）
const labelBorderOverlayStyle = computed(() => {
  const lb = pj.project.label
  return {
    position: 'absolute',
    inset: 0,
    border: `${Math.max(1, (lb.borderWidth || 0.3) * MM_TO_PX * pj.zoom)}px solid ${lb.borderColor || '#000'}`,
    boxSizing: 'border-box',
    pointerEvents: 'none',
    zIndex: 10
  }
})

onMounted(() => {
  initCanvas()
  setupDnd()
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onWindowResize)
  // 初始自动"适合窗口"：新打开/换标签尺寸时画布大小刚好填满可视区
  nextTick(() => {
    healBoundText()
    const z = fitZoomToWindow(wrapRef.value, pj.project.label.width, pj.project.label.height)
    if (z != null) {
      pj.zoom = z
      pj.autoFit = true
      applyZoom()
      drawGrid()
      renderAll()
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onWindowResize)
  if (fabricCanvas) fabricCanvas.dispose()
})

// 绑定已指向现有列，但文本还留着数据里没有的 {{旧字段}} 时，改写成新字段
function healBoundText() {
  const fixes = collectBindingTextFixes(
    pj.project.components,
    data.fields,
    pj.project.dataSource.fieldMap
  )
  for (const fix of fixes) {
    pj.updateComponent(fix.id, fix.cells ? { cells: fix.cells } : { text: fix.text })
  }
}

// 窗口尺寸变化：autoFit 模式下自动重新"适合窗口"
function onWindowResize() {
  if (!pj.autoFit) return
  const z = fitZoomToWindow(wrapRef.value, pj.project.label.width, pj.project.label.height)
  if (z != null && Math.abs(z - pj.zoom) > 0.01) pj.zoom = z  // watch 会触发 applyZoom
}

// ============ 画布初始化 ============
function initCanvas() {
  const w = pj.project.label.width * MM_TO_PX
  const h = pj.project.label.height * MM_TO_PX
  fabricCanvas = new fabric.Canvas(canvasRef.value, {
    width: w,
    height: h,
    backgroundColor: pj.project.paper.backgroundColor || '#fff',
    selection: true,
    preserveObjectStacking: true
  })
  bindCanvasEvents()
  drawGrid()
  renderAll()
}

// 标签尺寸变化后重建画布
function rebuildCanvas() {
  if (!fabricCanvas) return
  const w = pj.project.label.width * MM_TO_PX
  const h = pj.project.label.height * MM_TO_PX
  fabricCanvas.setDimensions({ width: w, height: h })
  fabricCanvas.backgroundColor = pj.project.paper.backgroundColor || '#fff'
  applyZoom()
  drawGrid()
  renderAll()
}

// 视图缩放：fabric 画布物理尺寸 + viewport 同步 zoom
// 内容逻辑坐标（mm）不变，setZoom 让所有对象/网格统一按 zoom 显示
function applyZoom() {
  if (!fabricCanvas) return
  const w = pj.project.label.width * MM_TO_PX * pj.zoom
  const h = pj.project.label.height * MM_TO_PX * pj.zoom
  fabricCanvas.setDimensions({ width: w, height: h })
  fabricCanvas.setZoom(pj.zoom)
  fabricCanvas.requestRenderAll()
}

// 画网格：每 5mm 一条主网格（深色），每 1mm 一条次网格（浅色）
// 仅在 showGrid 开启时绘制；缩放/尺寸变化后重画
function drawGrid() {
  if (!fabricCanvas) return
  // 清掉旧 grid
  const old = fabricCanvas.getObjects().filter(o => o.data && o.data.isGrid)
  old.forEach(o => fabricCanvas.remove(o))
  if (!pj.showGrid) { fabricCanvas.requestRenderAll(); return }

  const w = pj.project.label.width * MM_TO_PX
  const h = pj.project.label.height * MM_TO_PX
  const lines = []
  // 次网格：1mm 浅色细线
  for (let x = MM_TO_PX; x < w; x += MM_TO_PX) {
    lines.push(new fabric.Line([x, 0, x, h], {
      stroke: '#e5e7eb', strokeWidth: 0.4, selectable: false, evented: false,
      excludeFromExport: true, hoverCursor: 'default', data: { isGrid: true }
    }))
  }
  for (let y = MM_TO_PX; y < h; y += MM_TO_PX) {
    lines.push(new fabric.Line([0, y, w, y], {
      stroke: '#e5e7eb', strokeWidth: 0.4, selectable: false, evented: false,
      excludeFromExport: true, hoverCursor: 'default', data: { isGrid: true }
    }))
  }
  // 主网格：5mm 深色加粗
  for (let x = 0; x <= w; x += 5 * MM_TO_PX) {
    lines.push(new fabric.Line([x, 0, x, h], {
      stroke: '#94a3b8', strokeWidth: 0.7, selectable: false, evented: false,
      excludeFromExport: true, hoverCursor: 'default', data: { isGrid: true }
    }))
  }
  for (let y = 0; y <= h; y += 5 * MM_TO_PX) {
    lines.push(new fabric.Line([0, y, w, y], {
      stroke: '#94a3b8', strokeWidth: 0.7, selectable: false, evented: false,
      excludeFromExport: true, hoverCursor: 'default', data: { isGrid: true }
    }))
  }
  lines.forEach(l => fabricCanvas.add(l))
  // 全部置于最底层（先加的会在上面，需要 sendToBack）
  lines.forEach(l => fabricCanvas.sendObjectToBack(l))
  fabricCanvas.requestRenderAll()
}

function bindCanvasEvents() {
  // fabric 多选支持：按住 Shift / Cmd 点选多个；框选也支持
  fabricCanvas.on('selection:created', e => {
    if (isRendering || syncingSelection) return
    const sel = e.selected || []
    if (!sel.length) return
    const ids = sel.map(o => o.__id).filter(Boolean)
    if (e.e && (e.e.shiftKey || e.e.metaKey || e.e.ctrlKey)) {
      // 加选：合并已有选中
      pj.selectedIds = Array.from(new Set([...pj.selectedIds, ...ids]))
      pj.selectedId = pj.selectedIds[pj.selectedIds.length - 1]
    } else {
      // 单选 / 框选
      pj.selectedIds = ids
      pj.selectedId = ids[ids.length - 1] || null
    }
  })
  fabricCanvas.on('selection:updated', e => {
    if (isRendering || syncingSelection) return
    const sel = e.selected || []
    const ids = sel.map(o => o.__id).filter(Boolean)
    pj.selectedIds = ids
    pj.selectedId = ids[ids.length - 1] || null
  })
  fabricCanvas.on('selection:cleared', () => {
    // renderAll 期间由 clear() 触发的清空不应取消选中
    if (!isRendering && !syncingSelection) pj.clearSelection()
  })
  fabricCanvas.on('object:modified', e => {
    const obj = e.target
    if (!obj) return
    // 优先：obj 自身有 __id → 普通组件（含自建 fabric.Group，如表格/图片占位）
    // 注意：fabric 6 中 ActiveSelection 的 type 也是 'group'，不能用 type 区分
    if (obj.__id) {
      pj.updateComponent(obj.__id, geometryPatch(obj))
      return
    }
    // 无 __id 的 group/activeSelection → 多选整体：遍历子对象（各有独立 __id）
    if (obj.type === 'activeSelection' || obj.type === 'group') {
      const children = (typeof obj.getObjects === 'function') ? obj.getObjects() : []
      children.forEach(child => {
        if (!child?.__id) return
        pj.updateComponent(child.__id, geometryPatch(child))
      })
    }
  })
  // 点击图片占位（QR/条码/图片）→ 清掉失败标记并重绘
  fabricCanvas.on('mouse:down', e => {
    const t = e.target
    if (!t?.data?.isImagePlaceholder) return
    const url = t.data.failedUrl
    if (url) decodedImageUrlsFailed.delete(url)
    renderAll()
  })
}

// ============ 拖放 ============
function setupDnd() {
  const wrap = wrapRef.value
  wrap.addEventListener('dragover', e => {
    if (e.dataTransfer.types.includes('component-type') ||
        e.dataTransfer.types.includes('field-name')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  })

  wrap.addEventListener('drop', e => {
    e.preventDefault()
    const type = e.dataTransfer.getData('component-type')
    const field = e.dataTransfer.getData('field-name')

    // 鼠标 → 标签内 mm（CSS 像素先除 zoom 抵消缩放，再除 MM_TO_PX 转 mm）
    const rect = canvasRef.value.getBoundingClientRect()
    const xMm = (e.clientX - rect.left) / pj.zoom / MM_TO_PX
    const yMm = (e.clientY - rect.top) / pj.zoom / MM_TO_PX

    if (type) {
      addComponent(type, xMm, yMm)
    } else if (field) {
      const sel = pj.selectedComponent
      if (sel) {
        if (sel.type === 'checkbox') {
          pj.updateComponent(sel.id, { binding: field })
        } else if (sel.type === 'serial') {
          pj.updateComponent(sel.id, { source: 'field', binding: field })
        } else if (sel.type === 'date') {
          pj.updateComponent(sel.id, { source: 'field', binding: field })
        } else {
          const text = rewriteBindingText(sel.text || '', sel.binding || '', field)
          pj.updateComponent(sel.id, { binding: field, text })
        }
      } else {
        addComponent('text', xMm, yMm, { binding: field, text: `{{${field}}}` })
      }
    }
  })
}

// ============ 组件添加（坐标：相对标签 mm） ============
function genId() { return 'c_' + Math.random().toString(36).slice(2, 10) }

function defaultTableCells(rows, cols, fields = []) {
  const out = {}
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const binding = fields[c] || ''
      out[`${r},${c}`] = {
        text: binding ? `{{${binding}}}` : (r === 0 ? `列${c + 1}` : ''),
        binding
      }
    }
  }
  return out
}

function addComponent(type, xMm, yMm, extra = {}) {
  // 标签可用空间
  const lw = pj.project.label.width
  const lh = pj.project.label.height

  // 每种类型的默认尺寸（限制在标签内）
  const sizeDefaults = {
    text:   { w: Math.min(40, lw - 4),  h: Math.min(12, lh - 4) },
    image:  { w: Math.min(25, lw - 4),  h: Math.min(25, lh - 4) },
    table:  { w: Math.min(50, lw - 4),  h: Math.min(25, lh - 4) },
    qrcode: { w: Math.min(20, lw - 4),  h: Math.min(20, lh - 4) },
    barcode:{ w: Math.min(35, lw - 4),  h: Math.min(10, lh - 4) },
    rect:   { w: Math.min(40, lw - 4),  h: Math.min(20, lh - 4) },
    ellipse:{ w: Math.min(24, lw - 4),  h: Math.min(24, lh - 4) },
    line:   { w: Math.min(40, lw - 4),  h: 0 },
    date:   { w: Math.min(35, lw - 4),  h: Math.min(8, lh - 4) },
    serial: { w: Math.min(28, lw - 4),  h: Math.min(8, lh - 4) },
    checkbox:{ w: Math.min(8, lw - 4),  h: Math.min(8, lh - 4) }
  }
  const sz = sizeDefaults[type] || { w: Math.min(40, lw - 4), h: Math.min(20, lh - 4) }

  const def = {
    id: genId(),
    type,
    name: type,
    // 相对标签左上角 mm；中心对齐到鼠标
    left: xMm - sz.w / 2,
    top: yMm - sz.h / 2,
    width: sz.w,
    height: sz.h,
    angle: 0
  }
  let comp = {}
  switch (type) {
    case 'text':
      comp = { ...def, text: '文本', fontSize: 12, fill: '#000', fontFamily: 'Microsoft YaHei',
               fontWeight: 'normal', textAlign: 'left', binding: '' }
      break
    case 'image':
      comp = { ...def, src: '', source: 'static', binding: '' }
      break
    case 'qrcode':
      comp = { ...def, text: 'QR', binding: '' }
      break
    case 'barcode':
      comp = { ...def, text: '', binding: '', format: 'CODE128' }
      break
    case 'rect':
      comp = { ...def, fill: 'transparent', stroke: '#000', strokeWidth: 1, rx: 0 }
      break
    case 'ellipse':
      comp = { ...def, name: '椭圆', fill: 'transparent', stroke: '#000', strokeWidth: 1 }
      break
    case 'line':
      comp = { ...def, stroke: '#000', strokeWidth: 1 }
      break
    case 'date':
      comp = { ...def, text: dayjs().format('YYYY-MM-DD'), source: 'now', format: 'YYYY-MM-DD HH:mm:ss', binding: '',
               fontSize: 10, fill: '#000', fontFamily: 'Microsoft YaHei', fontWeight: 'normal', textAlign: 'left' }
      break
    case 'serial':
      comp = { ...def, name: '序号', source: 'print', binding: '', prefix: '', suffix: '', pad: 4,
               fontSize: 12, fill: '#000', fontFamily: 'Microsoft YaHei', fontWeight: 'bold', textAlign: 'left',
               hideIfEmpty: true }
      break
    case 'checkbox':
      comp = { ...def, name: '勾选', binding: '', checkedChar: '☑', uncheckedChar: '☐', checkedValue: '',
               fontSize: 14, fill: '#000', fontFamily: 'Microsoft YaHei', fontWeight: 'normal', textAlign: 'center',
               hideIfEmpty: false }
      break
    case 'table':
      comp = { ...def, rows: 3, cols: 3, cellPadding: 1, borderColor: '#333', borderWidth: 0.2,
               fill: '#fff', fontSize: 8, fontFamily: 'Microsoft YaHei', textAlign: 'left',
               vAlign: 'middle',
               // 表头样式 + 列宽比例（空数组 = 等宽）
               headerRow: true, headerBg: '#f1f5f9', colWidths: [],
               cells: defaultTableCells(3, 3, data.fields.slice(0, 3)) }
      break
  }
  comp = { ...comp, ...extra }
  pj.addComponent(comp)
  renderAll()
}

// ============ 渲染 ============
let renderGeneration = 0
let isRendering = false
// 图层/外部（store）驱动画布选中时置 true：
// 防止 setActiveObject 触发的 fabric selection:updated/created/cleared 事件
// 同步回写 store（否则会把图层多选覆盖成单选）
let syncingSelection = false

function renderAll() {
  if (!fabricCanvas) return
  const gen = ++renderGeneration
  isRendering = true
  // 保留当前选中（clear 会触发 selection:cleared 清空 selectedId）
  const selId = pj.selectedId
  fabricCanvas.clear()
  fabricCanvas.backgroundColor = pj.project.label.backgroundColor || '#fff'
  pj.project.components.forEach(c => {
    if (c.hidden) return
    const obj = buildFabricObject(c, gen)
    if (obj) fabricCanvas.add(obj)
  })
  // 恢复选中状态，避免属性面板丢失
  if (selId) {
    const obj = fabricCanvas.getObjects().find(o => o.__id === selId)
    if (obj) fabricCanvas.setActiveObject(obj)
  }
  fabricCanvas.renderAll()
  // 按数组顺序校正 z-order（同步 add 顺序已正确，但异步对象插入后会乱）
  syncZOrder()
  // renderAll 内部用 clear() 会把 grid 一起清掉，末尾补画一次
  if (pj.showGrid) drawGrid()
  isRendering = false
}

// ============ z-order 同步：fabric 对象层叠顺序 = store 组件数组顺序 ============
// （条形码/二维码/图片是异步 add，不校正会永远浮在最上层，导致设计与预览覆盖关系不一致）
function syncZOrder() {
  if (!fabricCanvas) return
  // 网格先全部沉底。否则把组件挪到 0 号位时，会把格子挤到条码和文字上面。
  const grids = fabricCanvas.getObjects().filter(o => o.data?.isGrid)
  grids.forEach(g => fabricCanvas.sendObjectToBack(g))
  const order = pj.project.components.map(c => c.id)
  let idx = grids.length
  for (const id of order) {
    const o = fabricCanvas.getObjects().find(x => x.__id === id)
    if (!o) continue
    if (fabricCanvas.getObjects().indexOf(o) !== idx) {
      fabricCanvas.moveObjectTo(o, idx)
    }
    idx++
  }
}

// ============ 异步图片安全添加 ============
function safeAddAsync(img, gen) {
  if (gen !== renderGeneration) return
  const owner = pj.project.components.find(c => c.id === img.__id)
  if (owner?.hidden) return
  dressHandles(img)
  fabricCanvas.add(img)
  // 异步对象插入位置可能不对，重新按 store 顺序校正
  syncZOrder()
  fabricCanvas.renderAll()
}

// 没有可编码内容时画虚线占位，标出字段名，避免看起来像一张真条码
function codePlaceholder(c, baseOpts, label) {
  const w = Math.max(8, (c.width || 10) * MM_TO_PX)
  const h = Math.max(8, (c.height || 10) * MM_TO_PX)
  const caption = String(c.binding || label)
  const bg = new fabric.Rect({
    left: 0, top: 0, width: w, height: h,
    fill: 'rgba(148, 163, 184, 0.10)',
    stroke: '#94a3b8', strokeWidth: 1,
    strokeDashArray: [5, 4],
    rx: 2, ry: 2
  })
  const fontSize = Math.max(9, Math.min(14, Math.min(w, h) * 0.32))
  const text = new fabric.Text(caption, {
    left: w / 2,
    top: h / 2,
    originX: 'center',
    originY: 'center',
    fontSize,
    fill: '#64748b',
    fontFamily: 'Microsoft YaHei, sans-serif'
  })
  return new fabric.Group([bg, text], { ...baseOpts })
}

// ============ 构建 fabric 对象（坐标即相对标签 mm） ============
function designRow() {
  const row = { ...(resolveRow(data.activeRow, pj.project.dataSource.fieldMap) || {}) }
  const cfg = pj.project.printConfig || {}
  if (!cfg.serialEnabled || rowIsEmpty(row)) return row
  if (row['序号'] == null || row['序号'] === '') {
    const start = Math.floor(Number(cfg.serialStart) || 1)
    row['序号'] = String(start + Math.max(0, data.activeRowIndex || 0))
  }
  return row
}

// 文本和表格按组件框裁切，和预览的 overflow:hidden 对齐。
// Fabric 的 clipPath 相对对象中心，所以要把裁切框的中心挪到「从左上角量出的盒子中心」。
function clipToBox(obj, boxW, boxH) {
  try {
    const w = obj.width || boxW
    const h = obj.height || boxH
    obj.clipPath = new fabric.Rect({
      width: Math.max(1, boxW),
      height: Math.max(1, boxH),
      originX: 'center',
      originY: 'center',
      left: -w / 2 + boxW / 2,
      top: -h / 2 + boxH / 2
    })
  } catch (e) { /* 裁切失败就保持原样，避免整张画布空白 */ }
}

function buildFabricObject(c, gen = renderGeneration) {
  // 字段映射后的行：模板字段名 → 数据源字段值
  const row = designRow()
  const baseOpts = {
    left: c.left * MM_TO_PX,
    top: c.top * MM_TO_PX,
    angle: c.angle || 0,
    originX: 'left',
    originY: 'top'
  }
  let obj = null

  switch (c.type) {
    case 'text': {
      // 字段失效 → 原地显示 ⚠字段名（仅设计态提示；打印/导出走 PreviewDialog，不受影响）
      const r = renderTextWithAlert(c.text || '', row, availFieldSet.value)
      obj = new fabric.Textbox(r.text, {
        ...baseOpts,
        width: (c.width || 40) * MM_TO_PX,
        fontSize: (c.fontSize || 14),
        fill: r.missing.length ? '#f97316' : c.fill,
        fontFamily: c.fontFamily,
        fontWeight: r.missing.length ? 'bold' : c.fontWeight,
        textAlign: c.textAlign || 'left',
        splitByGrapheme: true
      })
      break
    }
    case 'image': {
      const src = safeImageSrc(c.source === 'field' ? row[c.binding] : c.src)
      if (src) {
        fabric.Image.fromURL(src, { crossOrigin: 'anonymous' }).then(img => {
          if (!img) return
          img.set({ ...baseOpts,
            scaleX: (c.width * MM_TO_PX) / img.width,
            scaleY: (c.height * MM_TO_PX) / img.height
          })
          img.__id = c.id
          safeAddAsync(img, gen)
        })
        return null
      }
      // 无 src：画占位（虚线框 + 🖼 + 提示），与「图片」控件视觉一致
      const w = c.width * MM_TO_PX
      const h = c.height * MM_TO_PX
      const placeholderBg = new fabric.Rect({
        left: 0, top: 0, width: w, height: h,
        fill: 'rgba(148, 163, 184, 0.10)',
        stroke: '#94a3b8', strokeWidth: 1,
        strokeDashArray: [5, 4],
        rx: 4, ry: 4
      })
      const iconSize = Math.max(18, Math.min(36, Math.min(w, h) * 0.32))
      const iconText = new fabric.Text('🖼', {
        left: w / 2,
        top: h / 2 - iconSize * 0.15,
        fontSize: iconSize,
        originX: 'center', originY: 'center',
        fill: '#64748b'
      })
      const hintSize = Math.max(9, Math.min(13, Math.min(w, h) * 0.12))
      const hintText = new fabric.Text(t('点击右侧「选择图片」'), {
        left: w / 2,
        top: h / 2 + iconSize * 0.9,
        fontSize: hintSize,
        originX: 'center', originY: 'center',
        fill: '#64748b',
        fontFamily: 'Microsoft YaHei, sans-serif'
      })
      obj = new fabric.Group([placeholderBg, iconText, hintText], {
        ...baseOpts,
        subTargetCheck: false
      })
      break
    }
    case 'qrcode':
    case 'barcode': {
      const txt = codePayload(c, row)
      if (!txt) {
        obj = codePlaceholder(c, baseOpts, c.type === 'barcode' ? t('条码') : t('二维码'))
        break
      }
      const ready = c.type === 'barcode'
        ? Promise.resolve(generateBarcode(txt, { format: c.format }))
        : generateQRCode(txt, { width: 200 })
      ready.then(dataUrl => {
        if (!dataUrl) return
        fabric.Image.fromURL(dataUrl).then(img => {
          if (!img) return
          img.set({ ...baseOpts,
            scaleX: (c.width * MM_TO_PX) / img.width,
            scaleY: (c.height * MM_TO_PX) / img.height
          })
          img.__id = c.id
          safeAddAsync(img, gen)
        })
      })
      return null
    }
    case 'rect': {
      obj = new fabric.Rect({
        ...baseOpts,
        width: c.width * MM_TO_PX,
        height: c.height * MM_TO_PX,
        fill: c.fill,
        stroke: c.stroke,
        strokeWidth: c.strokeWidth,
        rx: (c.rx || 0) * MM_TO_PX,
        ry: (c.rx || 0) * MM_TO_PX
      })
      break
    }
    case 'ellipse': {
      const ew = c.width * MM_TO_PX
      const eh = c.height * MM_TO_PX
      obj = new fabric.Ellipse({
        ...baseOpts,
        rx: Math.max(1, ew / 2),
        ry: Math.max(1, eh / 2),
        // Ellipse 默认原点中心；改成左上角与其它组件一致
        originX: 'left',
        originY: 'top',
        fill: c.fill,
        stroke: c.stroke,
        strokeWidth: c.strokeWidth
      })
      break
    }
    case 'line': {
      obj = new fabric.Line(
        [0, 0, c.width * MM_TO_PX, 0],
        { ...baseOpts, stroke: c.stroke, strokeWidth: c.strokeWidth }
      )
      break
    }
    case 'date': {
      let txt = ''
      if (c.source === 'field' && row[c.binding]) {
        txt = dayjs(row[c.binding]).format(c.format || 'YYYY-MM-DD')
      } else {
        txt = dayjs().format(c.format || 'YYYY-MM-DD HH:mm:ss')
      }
      obj = new fabric.Textbox(txt, {
        ...baseOpts,
        width: (c.width || 40) * MM_TO_PX,
        fontSize: (c.fontSize || 12),
        fill: c.fill,
        fontFamily: c.fontFamily,
        fontWeight: c.fontWeight,
        textAlign: c.textAlign || 'left'
      })
      break
    }
    case 'serial':
    case 'checkbox': {
      const txt = c.type === 'serial' ? formatSerialText(c, row) : formatCheckboxText(c, row)
      obj = new fabric.Textbox(txt || (c.type === 'serial' ? '0001' : '☐'), {
        ...baseOpts,
        width: (c.width || 20) * MM_TO_PX,
        fontSize: (c.fontSize || 12),
        fill: c.fill,
        fontFamily: c.fontFamily || 'Microsoft YaHei',
        fontWeight: c.fontWeight || 'normal',
        textAlign: c.textAlign || (c.type === 'checkbox' ? 'center' : 'left')
      })
      break
    }
    case 'table': {
      obj = buildTable(c, row, baseOpts)
      break
    }
  }

  if (obj) {
    obj.__id = c.id
    obj.__type = c.type
    dressHandles(obj)
    if (c.type === 'text' || c.type === 'date' || c.type === 'serial' || c.type === 'checkbox') obj.lockScalingY = false
    if (c.type === 'text' || c.type === 'date' || c.type === 'serial' || c.type === 'checkbox' || c.type === 'table') {
      clipToBox(obj, (c.width || 40) * MM_TO_PX, (c.height || 10) * MM_TO_PX)
    }
  }
  return obj
}

// 角点用来放大缩小。拖完后把缩放折进宽高；文字类同时改字号，否则松手会缩回去。
function dressHandles(obj) {
  obj.set({
    cornerSize: 10,
    transparentCorners: false,
    cornerColor: '#2563eb',
    cornerStrokeColor: '#ffffff',
    borderColor: '#2563eb',
    borderScaleFactor: 1.6,
    padding: 1
  })
}

function geometryPatch(obj) {
  const sx = obj.scaleX || 1
  const sy = obj.scaleY || 1
  const patch = {
    left: obj.left / MM_TO_PX,
    top: obj.top / MM_TO_PX,
    width: obj.width * sx / MM_TO_PX,
    height: obj.height * sy / MM_TO_PX,
    angle: obj.angle
  }
  const c = pj.project.components.find(x => x.id === obj.__id)
  if (c && (c.type === 'text' || c.type === 'date' || c.type === 'serial' || c.type === 'checkbox' || c.type === 'table') && Math.abs(sy - 1) > 0.02) {
    patch.fontSize = Math.max(6, Math.min(96, Math.round((c.fontSize || 12) * sy)))
  }
  obj.scaleX = 1
  obj.scaleY = 1
  return patch
}

// ============ 表格 ============
// 单元格二维码/条码/图片 → dataURL 缓存（避免每帧重算）
const cellDataUrlCache = new Map()
// 已解码的 HTMLImageElement 缓存（dataURL → Image）
const decodedImageCache = new Map()
// 正在解码中的 URL，避免重复请求
const decodingUrls = new Set()

function makeCellDataUrl(type, value, cell, comp) {
  if (type === 'qrcode') {
    const key = `qr|${value}`
    if (!cellDataUrlCache.has(key)) {
      cellDataUrlCache.set(key, canvasToDataURL(qrToCanvas(value, 240)))
    }
    return cellDataUrlCache.get(key)
  }
  if (type === 'barcode') {
    const fmt = cell.format || comp.barcodeFormat || 'CODE128'
    const key = `bar|${value}|${fmt}`
    if (!cellDataUrlCache.has(key)) {
      const cv = barcodeToCanvas(value, { format: fmt })
      cellDataUrlCache.set(key, cv ? canvasToDataURL(cv) : '')
    }
    return cellDataUrlCache.get(key)
  }
  return value
}

/**
 * 同步取已解码图片；未解码则后台解码并在完成后触发一次重绘（两阶段渲染）
 */
function getDecodedImageSync(url) {
  if (!url || typeof url !== 'string') return null
  const cached = decodedImageCache.get(url)
  if (cached) return cached
  if (decodedImageUrlsFailed.has(url)) return null
  if (!decodingUrls.has(url)) {
    decodingUrls.add(url)
    const el = new Image()
    el.onload = () => {
      decodedImageCache.set(url, el)
      decodingUrls.delete(url)
      renderAll()
    }
    el.onerror = () => {
      decodedImageUrlsFailed.add(url)
      decodingUrls.delete(url)
    }
    el.src = url
  }
  return null
}
const decodedImageUrlsFailed = new Set()

/**
 * 用已解码的图片元素构造 fabric 图像（同步）
 */
function makeCellImage(el, left, top, w, h) {
  return new fabric.FabricImage(el, {
    left, top,
    scaleX: w / el.width,
    scaleY: h / el.height,
    strokeWidth: 0,
    selectable: false,
    evented: false
  })
}

// 估算按字符断行（splitByGrapheme）后的行数：全角≈1em，半角≈0.6em
function estimateTextLines(text, maxW, fontSize) {
  if (!text) return 1
  let w = 0
  for (const ch of text) w += ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.6
  return Math.max(1, Math.ceil(w / Math.max(1, maxW)))
}


function buildTable(c, row, baseOpts) {
  const rows = Math.max(1, c.rows || 3)
  const cols = Math.max(1, c.cols || 3)
  const totalW = c.width * MM_TO_PX
  const totalH = c.height * MM_TO_PX
  const baseRowH = totalH / rows
  const pad = (c.cellPadding || 1) * MM_TO_PX
  const borderColor = c.borderColor || '#333'
  const borderWidthPx = Math.max(0.5, (c.borderWidth || 0.2) * MM_TO_PX)
  const fontSize = (c.fontSize || 10)
  const fontFamily = c.fontFamily || 'Microsoft YaHei'
  const fill = c.fill || '#fff'
  const textAlign = c.textAlign || 'left'
  const headerRow = !!c.headerRow
  const headerBg = c.headerBg || '#f1f5f9'

  // 列宽比例（colWidths）：数量与列数不符时退回等宽
  const weights = (Array.isArray(c.colWidths) && c.colWidths.length === cols)
    ? c.colWidths.map(w => Math.max(0.05, Number(w) || 0))
    : Array(cols).fill(1)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const colW = weights.map(w => totalW * w / weightSum)
  const colX = []
  let acc = 0
  for (let i = 0; i < cols; i++) { colX.push(acc); acc += colW[i] }

  // 先算每个单元格的最终显示文本（{{}} 模板 / 绑定字段）
  const cellDisplays = []
  const cellTypes = []
  const cellAlerts = []   // 单元格是否引用了数据里不存在的字段（设计态橙色提示）
  for (let r = 0; r < rows; r++) {
    cellDisplays.push([])
    cellTypes.push([])
    cellAlerts.push([])
    for (let col = 0; col < cols; col++) {
      const cell = c.cells?.[`${r},${col}`] || { text: '', binding: '' }
      let raw = ''
      let miss = []
      if (cell.text && cell.text.includes('{{')) {
        const rr = renderTextWithAlert(cell.text, row, availFieldSet.value)
        raw = rr.text
        miss = rr.missing
      } else if (cell.binding) {
        if (rowIsEmpty(row)) {
          raw = cell.binding
        } else if (availFieldSet.value.size && !availFieldSet.value.has(cell.binding)) {
          raw = `⚠${cell.binding}`
          miss = [cell.binding]
        } else {
          raw = row?.[cell.binding] ?? cell.text ?? ''
        }
      } else {
        raw = cell.text ?? ''
      }
      cellDisplays[r].push(String(raw))
      cellTypes[r].push(cell.type || 'text')
      cellAlerts[r].push(miss.length > 0)
    }
  }

  // 行高自适应内容（与打印预览 HTML td 撑开行为一致）：
  // 每行实际高度 = max(基准行高, 该行最高内容所需高度)
  const rowH = Array(rows).fill(baseRowH)
  for (let r = 0; r < rows; r++) {
    let need = 0
    for (let col = 0; col < cols; col++) {
      if (cellTypes[r][col] !== 'text') continue
      const innerW = colW[col] - pad * 2
      const lines = estimateTextLines(cellDisplays[r][col], innerW, fontSize)
      need = Math.max(need, lines * fontSize * 1.2 + pad * 2)
    }
    rowH[r] = Math.max(baseRowH, need)
  }
  const rowsTotalH = rowH.reduce((a, b) => a + b, 0)
  const rowY = []
  { let accY = 0; for (let r = 0; r < rows; r++) { rowY.push(accY); accY += rowH[r] } }

  const items = []

  // strokeWidth 必须为 0。Fabric 默认是 1，就算不画描边也会把包围盒向外撑一圈，
  // 组件框从左上角裁切时，右边和下边的线会整段消失。
  const bg = new fabric.Rect({
    left: 0, top: 0,
    width: totalW, height: rowsTotalH,
    fill, strokeWidth: 0
  })
  items.push(bg)

  // 表头行底色留在边框内侧，避免盖住上边和左边的线
  if (headerRow && rows > 0) {
    items.push(new fabric.Rect({
      left: borderWidthPx, top: borderWidthPx,
      width: Math.max(1, totalW - borderWidthPx * 2),
      height: Math.max(1, rowH[0] - borderWidthPx * 2),
      fill: headerBg, strokeWidth: 0, selectable: false, evented: false
    }))
  }

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = colX[col]
      const cellW = colW[col]
      const cellH = rowH[r]
      const y = rowY[r]
      if (col < cols - 1) {
        const v = new fabric.Rect({
          left: x + cellW - borderWidthPx / 2, top: y,
          width: borderWidthPx, height: cellH,
          fill: borderColor, strokeWidth: 0, selectable: false, evented: false
        })
        items.push(v)
      }
      if (r < rows - 1) {
        const h = new fabric.Rect({
          left: x, top: y + cellH - borderWidthPx / 2,
          width: cellW, height: borderWidthPx,
          fill: borderColor, strokeWidth: 0, selectable: false, evented: false
        })
        items.push(h)
      }
      const cell = c.cells?.[`${r},${col}`] || { text: '', binding: '' }
      // display / cellType 已在上面预计算（cellDisplays / cellTypes）
      const display = cellDisplays[r][col]
      const cellType = cellTypes[r][col]
      const innerW = cellW - pad * 2
      const innerH = cellH - pad * 2
      const isHeader = r === 0 && headerRow

      if ((cellType === 'qrcode' || cellType === 'barcode') && isEncodableCode(display)) {
        const url = makeCellDataUrl(cellType, display, cell, c)
        const imgEl = url ? getDecodedImageSync(url) : null
        if (imgEl) {
          const ratio = imgEl.width / imgEl.height
          let w = innerW
          let h = w / ratio
          if (h > innerH) { h = innerH; w = h * ratio }
          items.push(makeCellImage(imgEl, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h))
        } else if (url) {
          // 首帧占位，图片解码完成后会自动重绘
          items.push(new fabric.Rect({
            left: x + pad, top: y + pad, width: innerW, height: innerH,
            fill: '#f1f5f9', strokeWidth: 0, selectable: false, evented: false,
            hoverCursor: 'pointer',
            data: { isImagePlaceholder: true, failedUrl: url }
          }))
        }
      } else if (cellType === 'image') {
        const url = safeImageSrc(display || cell.src || '')
        const imgEl = url ? getDecodedImageSync(url) : null
        if (imgEl) {
          const ratio = imgEl.width / imgEl.height
          let w = innerW
          let h = w / ratio
          if (h > innerH) { h = innerH; w = h * ratio }
          items.push(makeCellImage(imgEl, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h))
        } else if (url) {
          items.push(new fabric.Rect({
            left: x + pad, top: y + pad, width: innerW, height: innerH,
            fill: '#f1f5f9', strokeWidth: 0, selectable: false, evented: false,
            hoverCursor: 'pointer',
            data: { isImagePlaceholder: true, failedUrl: url }
          }))
        }
      } else if (display) {
        // 垂直对齐：top | middle（默认） | bottom
        const vAlign = c.vAlign || 'middle'
        let tbTop
        let originY
        if (vAlign === 'top') { tbTop = y + pad; originY = 'top' }
        else if (vAlign === 'bottom') { tbTop = y + cellH - pad; originY = 'bottom' }
        else { tbTop = y + cellH / 2; originY = 'center' }
        const alert = cellAlerts[r]?.[col]
        const t = new fabric.Textbox(display, {
          left: x + pad,
          top: tbTop,
          originX: 'left',
          originY,
          width: innerW,
          fontSize, fontFamily, fill: alert ? '#f97316' : '#111',
          fontWeight: (isHeader || alert) ? 'bold' : 'normal',
          textAlign: isHeader ? 'center' : textAlign,
          lineHeight: 1.2,
          splitByGrapheme: true,
          strokeWidth: 0, selectable: false, evented: false
        })
        items.push(t)
      }
    }
  }

  // 外框用填色细条，不用描边。描边画在边缘中线上，右边和下边会画出组件框，被裁切掉。
  const frameH = Math.max(borderWidthPx, Math.min(rowsTotalH, totalH))
  const bar = (left, top, width, height) => new fabric.Rect({
    left, top, width: Math.max(borderWidthPx, width), height: Math.max(borderWidthPx, height),
    fill: borderColor, strokeWidth: 0, selectable: false, evented: false
  })
  items.push(bar(0, 0, totalW, borderWidthPx))
  items.push(bar(0, frameH - borderWidthPx, totalW, borderWidthPx))
  items.push(bar(0, 0, borderWidthPx, frameH))
  items.push(bar(totalW - borderWidthPx, 0, borderWidthPx, frameH))

  const group = new fabric.Group(items, {
    ...baseOpts,
    subTargetCheck: false,
    objectCaching: false,
    strokeWidth: 0
  })
  return group
}

// ============ 键盘快捷键 ============
function onKey(e) {
  // 输入控件内不响应：在属性面板/数据面板输入框里 Backspace 删字、方向键移动光标
  // 是正常文本编辑，绝不能触发"删除组件"/"移动组件"
  const t = e.target
  const tag = t?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
  if (!pj.selectedId && pj.selectedIds.length === 0) return
  const c = pj.selectedComponent
  const step = e.shiftKey ? 5 : 1
  let dx = 0, dy = 0
  if (e.key === 'ArrowLeft') dx = -step
  else if (e.key === 'ArrowRight') dx = step
  else if (e.key === 'ArrowUp') dy = -step
  else if (e.key === 'ArrowDown') dy = step
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    // 多选时批量删除，主选时单删
    if (pj.selectedIds.length > 1) pj.removeSelected()
    else if (pj.selectedId) pj.removeComponent(pj.selectedId)
    e.preventDefault(); return
  }
  if (!c) return
  if (dx || dy) {
    // 多选时整体平移所有选中组件
    if (pj.selectedIds.length > 1) {
      pj.selectedIds.forEach(id => {
        const comp = pj.project.components.find(x => x.id === id)
        if (comp) pj.updateComponent(id, { left: comp.left + dx, top: comp.top + dy })
      })
    } else {
      pj.updateComponent(c.id, { left: c.left + dx, top: c.top + dy })
    }
    e.preventDefault()
  }
}

// ============ Watch ============
watch(() => pj.project.components, () => renderAll(), { deep: true })
watch(() => pj.project.printConfig, () => renderAll(), { deep: true })
watch(() => pj.project.label, () => rebuildCanvas(), { deep: true })
watch(() => data.activeRow, () => renderAll())

// 左侧组件单击：加到标签中心并选中（拖拽仍走画布 drop）
watch(() => pj.addRequest, () => {
  const type = pj.addRequestType
  if (!type) return
  addComponent(type, pj.project.label.width / 2, pj.project.label.height / 2)
})
// 字段映射变化 → 立即重绘（实时）
watch(() => pj.project.dataSource.fieldMap, () => renderAll(), { deep: true })
// 数据源字段变化 → 重绘（「字段失效」提示需要实时刷新）
watch(() => data.fields, () => renderAll(), { deep: true })
// 网格开关：重画（开关+尺寸都走 drawGrid）
watch(() => pj.showGrid, () => drawGrid())
// 缩放变化 → 同步 fabric 视口 + 让画布在视口居中（避免"右下移动"）
watch(() => pj.zoom, () => {
  applyZoom()
  nextTick(() => {
    const wrap = wrapRef.value
    if (!wrap) return
    // 让画布中心对齐到视口中心
    wrap.scrollTo({
      left: (wrap.scrollWidth - wrap.clientWidth) / 2,
      top: (wrap.scrollHeight - wrap.clientHeight) / 2
    })
  })
})
// store → fabric：把 selectedIds 同步为画布选中（含多选 ActiveSelection）
// 注意：fabric 事件是同步派发的，因此 syncingSelection 同步设置/复位即可拦截回写
watch([() => pj.selectedId, () => pj.selectedIds.length], () => {
  if (!fabricCanvas) return
  syncingSelection = true
  try {
    const objs = fabricCanvas.getObjects().filter(o => pj.selectedIds.includes(o.__id))
    if (objs.length > 1) {
      const sel = new fabric.ActiveSelection(objs, { canvas: fabricCanvas })
      fabricCanvas.setActiveObject(sel)
    } else if (objs.length === 1) {
      fabricCanvas.setActiveObject(objs[0])
    } else {
      fabricCanvas.discardActiveObject()
    }
    fabricCanvas.requestRenderAll()
  } finally {
    syncingSelection = false
  }
})
</script>

<style scoped>
.design-canvas-root {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.design-canvas-wrap {
  position: relative;
  flex: 1;
  overflow: auto;
  background: #e2e8f0;
  background-image:
    linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
    linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
    linear-gradient(-45deg, transparent 75%, #cbd5e1 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  min-height: 100%;
}
.label-canvas-wrapper {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  position: relative;
}
.canvas-empty {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  text-align: center;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bg) 20%, transparent),
    color-mix(in srgb, var(--bg-hover) 55%, transparent)
  );
}
.canvas-empty-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}
.canvas-empty-sub {
  font-size: 11px;
  color: var(--text-muted);
  max-width: 200px;
  line-height: 1.45;
}
.info-bar {
  position: absolute;
  left: 12px;
  bottom: 12px;
  background: color-mix(in srgb, #0f172a 88%, transparent);
  color: #f8fafc;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 2;
  pointer-events: auto;
  user-select: none;
  backdrop-filter: blur(4px);
}
.info-row { color: #bfdbfe; }
.info-muted { color: #94a3b8; font-weight: 500; }
@media (prefers-reduced-motion: reduce) {
  .info-bar { transition: none; }
}
</style>
