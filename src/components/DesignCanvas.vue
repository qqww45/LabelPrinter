<template>
  <div class="design-canvas-wrap" ref="wrapRef">
    <!-- 标签画布：只显示一个标签（数据单元） -->
    <div class="label-canvas-wrapper" :style="canvasWrapperStyle">
      <canvas ref="canvasRef"></canvas>
      <!-- 标签边框 overlay：不能用 wrapper border（fabric canvas 会盖住右/下边） -->
      <div v-if="pj.project.label.showBorder" class="label-border-overlay"
           :style="labelBorderOverlayStyle"></div>
    </div>

    <!-- 浮动信息条：左下角 + pointer-events:none 不抢点击 + 3 秒无操作后淡出 -->
    <div class="info-bar" :class="{ 'info-bar-fade': infoFaded }" @mouseenter="infoFaded = false" @mouseleave="scheduleInfoFade">
      <span>🏷 {{ pj.project.label.width }}×{{ pj.project.label.height }}mm</span>
      <span v-if="layoutSummary">🖨 {{ layoutSummary }}</span>
      <span>🔍 {{ Math.round(pj.zoom * 100) }}%</span>
      <span v-if="data.rows.length">📊 {{ data.activeRowIndex + 1 }}/{{ data.filteredRows.length }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onBeforeUnmount, nextTick } from 'vue'
import * as fabric from 'fabric'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { renderText, resolveRow } from '../utils/render'
import { generateQRCode } from '../utils/qrcode'
import { generateBarcode } from '../utils/barcode'
import { qrToCanvas, barcodeToCanvas, canvasToDataURL } from '../utils/cellImage'
import { fitZoomToWindow } from '../utils/canvasFit'
import { useI18n } from '../utils/i18n'
import dayjs from 'dayjs'

// 1mm = 3.7795275591 px (按 96dpi)
const MM_TO_PX = 96 / 25.4

const wrapRef = ref(null)
const canvasRef = ref(null)
let fabricCanvas = null

const pj = useProjectStore()
const data = useDataStore()
const { t } = useI18n()

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

// 排版摘要（提示该标签会被怎么排到纸上）
const layoutSummary = computed(() => {
  const L = pj.project.layout
  if (L.mode !== 'auto') return '单张（每页 1 个）'
  return `${L.cols} × ${L.rows} = ${L.cols * L.rows} 个/页`
})

// 信息条淡出：操作画布时立刻显示，无操作 3 秒后自动淡出，避免遮挡
const infoFaded = ref(false)
let infoFadeTimer = null
function scheduleInfoFade() {
  if (infoFadeTimer) clearTimeout(infoFadeTimer)
  infoFadeTimer = setTimeout(() => { infoFaded.value = true }, 3000)
}
function wakeInfo() { infoFaded.value = false; scheduleInfoFade() }
onMounted(() => { scheduleInfoFade() })
onBeforeUnmount(() => { if (infoFadeTimer) clearTimeout(infoFadeTimer) })

onMounted(() => {
  initCanvas()
  setupDnd()
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onWindowResize)
  // 初始自动"适合窗口"：新打开/换标签尺寸时画布大小刚好填满可视区
  nextTick(() => {
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
      pj.updateComponent(obj.__id, {
        left: obj.left / MM_TO_PX,
        top: obj.top / MM_TO_PX,
        width: obj.width * obj.scaleX / MM_TO_PX,
        height: obj.height * obj.scaleY / MM_TO_PX,
        angle: obj.angle
      })
      obj.scaleX = 1; obj.scaleY = 1
      return
    }
    // 无 __id 的 group/activeSelection → 多选整体：遍历子对象（各有独立 __id）
    if (obj.type === 'activeSelection' || obj.type === 'group') {
      const children = (typeof obj.getObjects === 'function') ? obj.getObjects() : []
      children.forEach(child => {
        if (!child?.__id) return
        // 子对象自身的 left/top 是绝对坐标（相对画布），去掉 ActiveSelection 的 transform
        pj.updateComponent(child.__id, {
          left: child.left / MM_TO_PX,
          top: child.top / MM_TO_PX,
          width: child.width * child.scaleX / MM_TO_PX,
          height: child.height * child.scaleY / MM_TO_PX,
          angle: child.angle
        })
        child.scaleX = 1; child.scaleY = 1
      })
      return
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
        pj.updateComponent(sel.id, { binding: field })
        if (!sel.text) pj.updateComponent(sel.id, { text: `{{${field}}}` })
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
    line:   { w: Math.min(40, lw - 4),  h: 0 },
    date:   { w: Math.min(35, lw - 4),  h: Math.min(8, lh - 4) }
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
      comp = { ...def, text: '123456', binding: '', format: 'CODE128' }
      break
    case 'rect':
      comp = { ...def, fill: 'transparent', stroke: '#000', strokeWidth: 1, rx: 0 }
      break
    case 'line':
      comp = { ...def, stroke: '#000', strokeWidth: 1 }
      break
    case 'date':
      comp = { ...def, text: dayjs().format('YYYY-MM-DD'), source: 'now', format: 'YYYY-MM-DD HH:mm:ss', binding: '',
               fontSize: 10, fill: '#000', fontFamily: 'Microsoft YaHei', fontWeight: 'normal', textAlign: 'left' }
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
  const order = pj.project.components.map(c => c.id)
  const objs = fabricCanvas.getObjects().filter(o => o.__id)
  let idx = 0
  for (const id of order) {
    const o = objs.find(x => x.__id === id)
    if (o && fabricCanvas.getObjects().indexOf(o) !== idx) {
      fabricCanvas.moveObjectTo(o, idx)
    }
    if (o) idx++
  }
}

// ============ 异步图片安全添加 ============
function safeAddAsync(img, gen) {
  if (gen !== renderGeneration) return
  fabricCanvas.add(img)
  // 异步对象插入位置可能不对，重新按 store 顺序校正
  syncZOrder()
  fabricCanvas.renderAll()
}

// ============ 构建 fabric 对象（坐标即相对标签 mm） ============
function buildFabricObject(c, gen = renderGeneration) {
  // 字段映射后的行：模板字段名 → 数据源字段值
  const row = resolveRow(data.activeRow, pj.project.dataSource.fieldMap)
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
      const txt = renderText(c.text || '', row)
      obj = new fabric.Textbox(txt, {
        ...baseOpts,
        width: (c.width || 40) * MM_TO_PX,
        fontSize: (c.fontSize || 14),
        fill: c.fill,
        fontFamily: c.fontFamily,
        fontWeight: c.fontWeight,
        textAlign: c.textAlign || 'left',
        splitByGrapheme: true
      })
      break
    }
    case 'image': {
      const src = c.source === 'field' ? row[c.binding] : c.src
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
    case 'qrcode': {
      const txt = c.binding ? (row[c.binding] || c.text || '') : (c.text || '')
      generateQRCode(String(txt), { width: 200 }).then(dataUrl => {
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
    case 'barcode': {
      const txt = c.binding ? (row[c.binding] || c.text || '123456') : (c.text || '123456')
      const dataUrl = generateBarcode(String(txt), { format: c.format })
      if (dataUrl) {
        fabric.Image.fromURL(dataUrl).then(img => {
          if (!img) return
          img.set({ ...baseOpts,
            scaleX: (c.width * MM_TO_PX) / img.width,
            scaleY: (c.height * MM_TO_PX) / img.height
          })
          img.__id = c.id
          safeAddAsync(img, gen)
        })
      }
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
    case 'table': {
      obj = buildTable(c, row, baseOpts)
      break
    }
  }

  if (obj) {
    obj.__id = c.id
    obj.__type = c.type
  }
  return obj
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
  for (let r = 0; r < rows; r++) {
    cellDisplays.push([])
    cellTypes.push([])
    for (let col = 0; col < cols; col++) {
      const cell = c.cells?.[`${r},${col}`] || { text: '', binding: '' }
      const raw = (cell.text && cell.text.includes('{{'))
        ? renderText(cell.text, row)
        : (cell.binding ? (row[cell.binding] ?? cell.text ?? '') : (cell.text ?? ''))
      cellDisplays[r].push(String(raw))
      cellTypes[r].push(cell.type || 'text')
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

  const bg = new fabric.Rect({
    left: 0, top: 0,
    width: totalW, height: rowsTotalH,
    fill, stroke: borderColor, strokeWidth: borderWidthPx
  })
  items.push(bg)

  // 表头行底色
  if (headerRow && rows > 0) {
    items.push(new fabric.Rect({
      left: borderWidthPx / 2, top: borderWidthPx / 2,
      width: Math.max(1, totalW - borderWidthPx),
      height: Math.max(1, rowH[0] - borderWidthPx),
      fill: headerBg, selectable: false, evented: false
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
          fill: borderColor, selectable: false, evented: false
        })
        items.push(v)
      }
      if (r < rows - 1) {
        const h = new fabric.Rect({
          left: x, top: y + cellH - borderWidthPx / 2,
          width: cellW, height: borderWidthPx,
          fill: borderColor, selectable: false, evented: false
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

      if (cellType === 'qrcode' || cellType === 'barcode') {
        const url = display ? makeCellDataUrl(cellType, display, cell, c) : ''
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
            fill: '#f1f5f9', selectable: false, evented: false,
            hoverCursor: 'pointer',
            data: { isImagePlaceholder: true, failedUrl: url }
          }))
        }
      } else if (cellType === 'image') {
        const url = display || cell.src || ''
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
            fill: '#f1f5f9', selectable: false, evented: false,
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
        const t = new fabric.Textbox(display, {
          left: x + pad,
          top: tbTop,
          originX: 'left',
          originY,
          width: innerW,
          fontSize, fontFamily, fill: '#111',
          fontWeight: isHeader ? 'bold' : 'normal',
          textAlign: isHeader ? 'center' : textAlign,
          lineHeight: 1.2,
          splitByGrapheme: true,
          selectable: false, evented: false
        })
        items.push(t)
      }
    }
  }

  const group = new fabric.Group(items, {
    ...baseOpts,
    subTargetCheck: false
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
watch(() => pj.project.label, () => rebuildCanvas(), { deep: true })
watch(() => data.activeRow, () => renderAll())
// 字段映射变化 → 立即重绘（实时）
watch(() => pj.project.dataSource.fieldMap, () => renderAll(), { deep: true })
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
.info-bar {
  position: absolute;
  left: 12px;            /* 左下角，不挡组件 / 缩放控件 */
  bottom: 12px;
  background: rgba(15, 23, 42, 0.85);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  gap: 12px;
  z-index: 2;            /* 低于 fabric 的选中框 / 拖拽框 */
  pointer-events: auto;  /* 默认接受 hover（用户可主动触发展示） */
  user-select: none;
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 1;
}
.info-bar-fade {
  opacity: 0.15;         /* 淡出后保留微弱可见性，便于用户感知位置 */
  transform: translateY(2px);
}
.info-bar-fade:hover { opacity: 0.9; }  /* hover 立即恢复 */
</style>
