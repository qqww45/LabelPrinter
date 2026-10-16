<template>
  <div class="modal-overlay preview-overlay" @click.self="$emit('close')">
    <div class="preview-modal">
      <div class="modal-header">
        <div class="header-title">
          {{ t('打印预览') }}
          <span class="header-meta">
            ({{ data.displayRows.length || 0 }} {{ t('条') }}<template v-if="labelCount !== (data.displayRows.length || 0)"> · {{ labelCount }} {{ t('张') }}</template> / {{ totalPages }} {{ t('页') }})
          </span>
        </div>
        <div class="header-tools">
          <div class="tool-group">
            <input class="input page-input" type="number" :value="currentPage"
              min="1" :max="totalPages" @input="goToPage(+$event.target.value)" />
            <span class="page-total">/ {{ totalPages }}</span>
            <button class="btn btn-sm" @click="prevPage">←</button>
            <button class="btn btn-sm" @click="nextPage">→</button>
          </div>
          <div class="tool-group">
            <button class="btn btn-sm" @click="zoomOut">−</button>
            <span class="zoom-label">{{ Math.round(scale*100) }}%</span>
            <button class="btn btn-sm" @click="zoomIn">+</button>
            <button class="btn btn-sm" @click="scale = 1" :title="t('真实物理尺寸（1:1）')">1:1</button>
          </div>
          <div class="tool-group tool-actions">
            <button class="btn btn-primary" @click="onPrint">{{ t('打印') }}</button>
            <div class="more-wrap">
              <button class="btn" :class="{ active: moreOpen }" @click="moreOpen = !moreOpen">{{ t('更多') }} ▾</button>
              <div v-if="moreOpen" class="more-menu" @click.stop>
                <button class="more-item" @click="runMore('pdf')">{{ t('导出 PDF') }}</button>
                <button class="more-item" @click="runMore('image')">{{ t('导出图片') }}</button>
                <button class="more-item" @click="runMore('queue')" :title="t('按当前打印设置加入队列，稍后依次打印')">{{ t('加入队列') }}</button>
              </div>
            </div>
            <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
          </div>
        </div>
      </div>

      <!-- 预览区：仅当前页 -->
      <div class="preview-body">
        <div class="pages">
          <div v-if="currentPageData" class="page" :style="pageStyle">
            <div class="label" :style="labelStyle">
              <div
                v-for="(slot, si) in currentPageData.slots"
                :key="si"
                class="label-slot"
                :style="slotStyle(si)"
              >
                <CompRenderer v-if="!slot.empty" :c="comp" :row="mappedRow(slot.row)" v-for="comp in project.project.components" :key="comp.id" />
                <div v-if="labelBorderStyle" :style="labelBorderStyle"></div>
                <div v-if="slot.empty && !labelBorderStyle" class="slot-placeholder">{{ t('无数据') }}</div>
              </div>
            </div>
          </div>
          <div v-else class="empty-page">
            <div class="empty-title">{{ t('还没有可预览的数据') }}</div>
            <div class="empty-sub">{{ t('去底部数据面板导入 Excel/CSV，再回来预览打印') }}</div>
            <button class="btn btn-primary" @click="$emit('close')">{{ t('去数据面板导入') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的完整渲染容器（供打印/导出用） -->
    <div class="export-hidden" aria-hidden="true">
      <div
        v-for="(page, pi) in pages"
        :key="'ep' + pi"
        class="page"
        :style="pageStyle"
        :ref="el => pageRefs[pi] = el"
      >
        <div class="label" :style="labelStyle">
          <div
            v-for="(slot, si) in page.slots"
            :key="'s' + si"
            class="label-slot"
            :style="slotStyle(si)"
          >
            <CompRenderer v-if="!slot.empty" :c="comp" :row="mappedRow(slot.row)" v-for="comp in project.project.components" :key="comp.id" />
            <div v-if="labelBorderStyle" :style="labelBorderStyle"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount, h, defineComponent } from 'vue'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { renderText, resolveRow, codePayload, isEncodableCode } from '../utils/render'
import { escapeHtmlWithBreaks, safeImageSrc } from '../utils/escapeHtml'
import { expandPrintLabels, paginateLabels, componentHidden } from '../utils/printModel'
import { exportVectorPDF } from '../utils/vectorPdf'
import { qrToCanvas, barcodeToCanvas, canvasToDataURL } from '../utils/cellImage'
import { exportElementToImage } from '../utils/pdf'
import { usePrintStore } from '../stores/print'
import { useI18n } from '../utils/i18n'
import { toastError, toastSuccess } from '../utils/toast'
import dayjs from 'dayjs'

const { t } = useI18n()

const props = defineProps({
  autoExport: { type: String, default: '' }
})

const project = useProjectStore()
const data = useDataStore()
const printStore = usePrintStore()

const MM_TO_PX = 96 / 25.4
const currentPage = ref(1)
// 默认用设计画布的 zoom，保证"预览所见 = 设计所见"（否则预览比例跟设计画布对不上，用户会以为尺寸错了）
const scale = ref(project.zoom || 1.5)
const pageRefs = ref([])
const moreOpen = ref(false)

function runMore(kind) {
  moreOpen.value = false
  if (kind === 'pdf') onExportPDF()
  else if (kind === 'image') onExportImage()
  else if (kind === 'queue') addQueue()
}

function onDocClick(e) {
  if (!moreOpen.value) return
  if (!e.target.closest?.('.more-wrap')) moreOpen.value = false
}

// 预览缩放因子：1mm 对应多少 px（与用户缩放联动）
function S() { return MM_TO_PX * scale.value }

// 等待所有 <img> 真正加载完（data:URL 同步也算完成；外部 URL 最多等 timeout）
function waitForImages(els, timeout = 3000) {
  const imgs = [...els].flatMap(el => [...el.querySelectorAll('img')])
  if (!imgs.length) return Promise.resolve()
  return new Promise(resolve => {
    let pending = imgs.length
    const done = () => { if (--pending <= 0) resolve() }
    const fail = () => done()  // 单张失败不阻塞
    imgs.forEach(img => {
      if (img.complete && img.naturalWidth > 0) return done()
      img.addEventListener('load', done, { once: true })
      img.addEventListener('error', fail, { once: true })
    })
    setTimeout(resolve, timeout)  // 兜底
  })
}

// ============ 分页逻辑 ============
// single 模式：1 条数据 = 1 页 = 1 个标签
// auto 模式：每页 rows×cols 个标签，按数据顺序填充
const layoutCfg = computed(() => {
  const l = project.project.layout
  const cols = Math.max(1, l.cols || 1)
  const rws = Math.max(1, l.rows || 1)
  return { mode: l.mode || 'single', cols, rws, hGap: l.hGap || 0, vGap: l.vGap || 0 }
})

const labelsPerPage = computed(() => {
  const l = layoutCfg.value
  return l.mode === 'auto' ? l.cols * l.rws : 1
})

const printLabels = computed(() => {
  const cfg = project.project.printConfig || {}
  return expandPrintLabels(data.displayRows, cfg).map(item => ({
    ...item,
    row: resolveRow(item.row, project.project.dataSource?.fieldMap)
  }))
})
const labelCount = computed(() => data.displayRows.length ? printLabels.value.length : 0)
const pages = computed(() => paginateLabels(printLabels.value, labelsPerPage.value))

const totalPages = computed(() => Math.max(1, pages.value.length))
const currentPageData = computed(() => {
  // 允许临时超出范围（导出时 currentPage 被设为 1）
  const idx = Math.min(Math.max(0, currentPage.value - 1), pages.value.length - 1)
  return pages.value[idx]
})

// 字段映射：数据行 → 模板字段行（预览/打印/导出统一生效）
function mappedRow(row) {
  return resolveRow(row, project.project.dataSource.fieldMap)
}

// 每个 slot 在内容区内的位置（px）
function slotStyle(si) {
  const l = layoutCfg.value
  // 标签的物理尺寸 = project.label（数据单元），不是内容区大小
  const lb = project.project.label
  const lw = lb.width * S()
  const lh = lb.height * S()
  // 注意：边框不用 slot 自身 border——html2canvas 对 overflow:hidden 元素
  // 的右/下边框有裁剪 bug，改用内部 inset 框（见 labelBorderStyle）
  const bg = lb.backgroundColor ? { background: lb.backgroundColor } : {}
  if (l.mode !== 'auto' || l.cols <= 1 && l.rws <= 1) {
    // 单个模式：标签在标签区左上角；如果标签比标签区大则裁切
    return { position: 'absolute', left: 0, top: 0, width: lw + 'px', height: lh + 'px', overflow: 'hidden', ...bg }
  }
  const hGap = (l.hGap || 0) * S()
  const vGap = (l.vGap || 0) * S()
  const col = si % l.cols
  const row = Math.floor(si / l.cols)
  return {
    position: 'absolute',
    left: (col * (lw + hGap)) + 'px',
    top: (row * (lh + vGap)) + 'px',
    width: lw + 'px',
    height: lh + 'px',
    overflow: 'hidden',
    ...bg
  }
}

// 标签内边框：绝对定位铺满 slot 的独立 div，四边完整渲染
const labelBorderStyle = computed(() => {
  const lb = project.project.label
  if (!lb.showBorder) return null
  return {
    position: 'absolute',
    inset: 0,
    border: `${(lb.borderWidth || 0.3) * S()}px solid ${lb.borderColor || '#000'}`,
    boxSizing: 'border-box',
    pointerEvents: 'none'
  }
})

// ============ 组件渲染器（函数式） ============
const CompRenderer = defineComponent({
  name: 'CompRenderer',
  props: { c: { type: Object, required: true }, row: { type: Object, default: () => ({}) } },
  setup(props) {
    return () => {
      const c = props.c
      const row = props.row || {}
      if (componentHidden(c, row)) return null
      const style = compStyle(c)
      let inner = null
      switch (c.type) {
        case 'text': {
          inner = h('div', { style: textStyle(c), innerHTML: renderTextHtml(c.text || '', row) })
          break
        }
        case 'image': {
          const src = imageSrc(c, row)
          if (!src) return null
          inner = h('img', { src, style: imgStyle(c), crossorigin: 'anonymous' })
          break
        }
        case 'qrcode':
        case 'barcode': {
          const txt = codePayload(c, row)
          if (!txt) {
            inner = h('div', { style: codePlaceholderStyle() }, c.binding || (c.type === 'barcode' ? t('条码') : t('二维码')))
            break
          }
          const cv = c.type === 'barcode'
            ? barcodeToCanvas(String(txt), { format: c.format || 'CODE128' })
            : qrToCanvas(String(txt), 240)
          const url = cv ? canvasToDataURL(cv) : ''
          if (!url) return null
          inner = h('img', { src: url, style: imgStyle(c) })
          break
        }
        case 'rect': {
          inner = h('div', { style: rectStyle(c) })
          break
        }
        case 'line': {
          inner = h('div', { style: lineStyle(c) })
          break
        }
        case 'date': {
          inner = h('div', { style: textStyle(c) }, formatDate(c, row))
          break
        }
        case 'table': {
          const rowsArr = []
          for (let r = 0; r < (c.rows || 3); r++) {
            const tds = []
            for (let col = 0; col < (c.cols || 3); col++) {
              tds.push(h('td', { style: tableCellStyle(c, r, col) }, tableCellNode(c, r, col, row)))
            }
            rowsArr.push(h('tr', { style: { height: (100 / Math.max(1, c.rows || 3)) + '%' } }, tds))
          }
          inner = h('table', { style: tableBaseStyle(c), class: 'pv-table' }, [
            tableColgroup(c),
            rowsArr
          ])
          break
        }
        default: return null
      }
      return h('div', { class: 'comp', style, 'data-comp-id': c.id }, [inner])
    }
  }
})

// ============ 样式函数 ============
const pageStyle = computed(() => {
  const p = project.project.paper
  return {
    width: (p.width * S()) + 'px',
    height: (p.height * S()) + 'px',
    padding: 0,
    margin: '20px auto',
    background: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
  }
})

const labelStyle = computed(() => {
  // 纸张 - 纸张边距 = 标签区
  const p = project.project.paper
  const m = project.project.margin
  const w = (p.width - m.left - m.right) * S()
  const h = (p.height - m.top - m.bottom) * S()
  return {
    position: 'relative',
    width: w + 'px',
    height: h + 'px',
    marginLeft: (m.left * S()) + 'px',
    marginTop: (m.top * S()) + 'px',
    overflow: 'hidden'
  }
})

// 每个标签的左上角和尺寸（相对标签区，px）
function slotRect(idx) {
  const lw = project.project.label.width * S()
  const lh = project.project.label.height * S()
  const L = project.project.layout
  if (L.mode !== 'auto' || !L.cols || !L.rows || (L.cols <= 1 && L.rows <= 1)) {
    return { x: 0, y: 0, w: lw, h: lh }
  }
  const hGap = (L.hGap || 0) * S()
  const vGap = (L.vGap || 0) * S()
  const col = idx % L.cols
  const row = Math.floor(idx / L.cols)
  return {
    x: col * (lw + hGap),
    y: row * (lh + vGap),
    w: lw, h: lh
  }
}

function compStyle(c) {
  return {
    position: 'absolute',
    left: (c.left * S()) + 'px',
    top: (c.top * S()) + 'px',
    width: (c.width * S()) + 'px',
    height: (c.height * S()) + 'px',
    transform: c.angle ? `rotate(${c.angle}deg)` : 'none',
    transformOrigin: 'top left',
    overflow: 'hidden'
  }
}

function textStyle(c) {
  return {
    fontSize: ((c.fontSize || 14) * scale.value) + 'px',
    color: c.fill,
    fontFamily: c.fontFamily,
    fontWeight: c.fontWeight,
    textAlign: c.textAlign || 'left',
    lineHeight: 1.2,
    width: '100%',
    height: '100%',
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap'
  }
}

function imgStyle(c) {
  return { width: '100%', height: '100%', objectFit: 'fill' }
}

function rectStyle(c) {
  return {
    width: '100%',
    height: '100%',
    background: c.fill,
    border: `${(c.strokeWidth||1) * scale.value}px solid ${c.stroke}`,
    borderRadius: ((c.rx||0) * S()) + 'px'
  }
}

function lineStyle(c) {
  return {
    width: '100%',
    height: Math.max(1, (c.strokeWidth || 1) * scale.value) + 'px',
    background: c.stroke || '#000'
  }
}

function tableBaseStyle(c) {
  return {
    width: '100%',
    height: '100%',
    background: c.fill || '#fff',
    borderCollapse: 'separate',
    borderSpacing: '0',
    boxSizing: 'border-box',
    color: '#111',
    fontSize: (c.fontSize || 10) * scale.value + 'px',
    fontFamily: c.fontFamily || 'Microsoft YaHei',
    textAlign: c.textAlign || 'left',
    tableLayout: 'fixed'
  }
}

// 列宽比例 → <colgroup>；数量与列数不符时等宽
function tableColgroup(c) {
  const cols = Math.max(1, c.cols || 3)
  const weights = (Array.isArray(c.colWidths) && c.colWidths.length === cols)
    ? c.colWidths.map(w => Math.max(0.05, Number(w) || 0))
    : Array(cols).fill(1)
  const sum = weights.reduce((a, b) => a + b, 0)
  return h('colgroup', weights.map((w, i) =>
    h('col', { key: 'col' + i, style: { width: (w / sum * 100).toFixed(3) + '%' } })
  ))
}

function tableCellStyle(c, r = 0, col = 0) {
  const bw = (c.borderWidth || 0.2) * S()
  const edge = `${bw}px solid ${c.borderColor || '#333'}`
  const rows = Math.max(1, c.rows || 3)
  const isHeader = r === 0 && !!c.headerRow
  // 每条内边线只归一个格子。collapse 时相邻格子各画一条，html2canvas 会把中间线叠粗。
  return {
    borderTop: r === 0 ? edge : '0',
    borderLeft: col === 0 ? edge : '0',
    borderRight: edge,
    borderBottom: edge,
    boxSizing: 'border-box',
    position: 'relative',
    height: (100 / rows) + '%',
    overflow: 'hidden',
    padding: ((c.cellPadding || 1) * S()) + 'px',
    verticalAlign: c.vAlign || 'middle',
    wordBreak: 'break-all',
    background: isHeader ? (c.headerBg || '#f1f5f9') : (c.fill || '#fff'),
    fontWeight: isHeader ? 'bold' : 'normal',
    textAlign: isHeader ? 'center' : (c.textAlign || 'left')
  }
}

function tableCellText(c, r, col, row) {
  const cell = c.cells?.[`${r},${col}`]
  if (!cell) return ''
  // 文本含 {{占位符}} → 模板渲染（支持"前缀{{字段}}后缀"拼接）
  if (cell.text && cell.text.includes('{{')) return renderText(cell.text, row)
  if (cell.binding) {
    const v = row[cell.binding]
    return v != null && v !== '' ? v : (cell.text || '')
  }
  return cell.text || ''
}

// 单元格渲染节点：文本 / 二维码 / 条码 / 图片
const cellImgCache = ref({})
function tableCellNode(c, r, col, row) {
  const cell = c.cells?.[`${r},${col}`]
  if (!cell) return ''
  const type = cell.type || 'text'
  const value = tableCellText(c, r, col, row)

  if (type === 'qrcode' || type === 'barcode') {
    if (!isEncodableCode(value)) return value || ''
    const key = `${c.id}|${r},${col}|${type}|${value}|${cell.format || ''}`
    if (!cellImgCache.value[key]) {
      const cv = type === 'qrcode'
        ? qrToCanvas(String(value), 240)
        : barcodeToCanvas(String(value), { format: cell.format || 'CODE128' })
      cellImgCache.value[key] = cv ? canvasToDataURL(cv) : ''
    }
    const src = cellImgCache.value[key]
    if (!src) return ''
    return h('img', { src, style: cellImageStyle(c) })
  }

  if (type === 'image') {
    const src = safeImageSrc(value || cell.src || '')
    if (!src) return ''
    return h('img', { src, style: cellImageStyle(c) })
  }

  return value
}

function cellImageStyle(c) {
  const pad = (c.cellPadding || 1) * S()
  // 脱离文档流，避免二维码、条码的原始像素把行高撑开。缩放方式和画布一致：放进格子里。
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: `calc(100% - ${pad * 2}px)`,
    maxHeight: `calc(100% - ${pad * 2}px)`,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain'
  }
}

function renderTextHtml(text, row) {
  if (!text) return ''
  // 先渲染占位符，再 HTML 转义，避免导入数据注入脚本
  return escapeHtmlWithBreaks(renderText(text, row))
}

function imageSrc(c, row) {
  const raw = c.source === 'field' ? (row[c.binding] || '') : (c.src || '')
  return safeImageSrc(raw)
}

function codePlaceholderStyle() {
  return {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    border: '1px dashed #94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    fontSize: '11px',
    background: 'rgba(148,163,184,0.12)',
    textAlign: 'center',
    padding: '2px'
  }
}

function formatDate(c, row) {
  if (c.source === 'field' && row[c.binding]) {
    return dayjs(row[c.binding]).format(c.format || 'YYYY-MM-DD')
  }
  return dayjs().format(c.format || 'YYYY-MM-DD HH:mm:ss')
}

// ============ 翻页 / 缩放 ============
function prevPage() { if (currentPage.value > 1) currentPage.value-- }
function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }
function goToPage(p) { if (p >= 1 && p <= totalPages.value) currentPage.value = p }
function zoomIn() { scale.value = Math.min(3, +(scale.value + 0.1).toFixed(2)) }
function zoomOut() { scale.value = Math.max(0.3, +(scale.value - 0.1).toFixed(2)) }

watch(totalPages, v => {
  if (currentPage.value > v) currentPage.value = v
})

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  window.__labelPrinterExport = async (type) => {
    await nextTick()
    if (type === 'pdf') onExportPDF()
    else if (type === 'image') onExportImage()
  }
  if (props.autoExport === 'pdf') {
    await nextTick()
    onExportPDF()
  } else if (props.autoExport === 'image') {
    await nextTick()
    onExportImage()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  delete window.__labelPrinterExport
})

// ============ 打印/导出 ============
// 等二维码请求结束，再等 img 解码。先让本轮渲染把请求发出去。
async function settleImages(timeout = 4000) {
  const start = Date.now()
  let els = []
  while (Date.now() - start < timeout) {
    await nextTick()
    els = pageRefs.value.filter(Boolean)
    if (els.length) {
      await waitForImages(els, 800)
      return pageRefs.value.filter(Boolean)
    }
    await new Promise(r => setTimeout(r, 40))
  }
  return els
}

// 按任务参数筛页：all=全部 / current=当前页 / range=区间
function pagesForTask(opts = {}) {
  const all = pageRefs.value.filter(Boolean)
  const range = opts.range || 'all'
  if (range === 'current') {
    const i = Math.min(Math.max(0, currentPage.value - 1), all.length - 1)
    return all.slice(i, i + 1)
  }
  if (range === 'range') {
    const s = Math.max(1, opts.rangeStart || 1)
    const e = Math.max(s, opts.rangeEnd || s)
    return all.slice(s - 1, e)
  }
  return all
}

function rangeLabel(o = {}) {
  if (!o.range || o.range === 'all') return '全部'
  if (o.range === 'current') return `第 ${currentPage.value} 页`
  return `${o.rangeStart || 1}-${o.rangeEnd || '?'} 页`
}

/**
 * 核心打印：按 opts（range/rangeStart/rangeEnd/copies）构建打印 HTML 并调起系统打印
 */
async function printPages(opts = {}) {
  // 打印仍用 cloneNode，保证与预览像素级一致；文案已在 CompRenderer 里 escape，不改版式。
  await settleImages()
  const els = pagesForTask(opts)
  if (!els.length) { toastError(t('没有可打印的内容')); return false }
  // 等二维码/条形码 data:URL 生成完（生成是异步的，且 await 链可达）
  await waitForImages(els, 3000)

  // 份数已经在 printLabels 里展开成独立的页，这里按页输出一次
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  // 灰度开关：打印 CSS 滤镜
  const grayscaleFilter = opts.grayscale ? 'filter: grayscale(1);' : ''

  const doc = iframe.contentDocument
  doc.open()
  doc.write(`<!DOCTYPE html><html><head><title>print</title>
    <style>
      @page { size: ${project.project.paper.width}mm ${project.project.paper.height}mm; margin: 0; }
      body { margin: 0; padding: 0; }
      .page {
        position: relative;
        width: ${project.project.paper.width}mm;
        height: ${project.project.paper.height}mm;
        page-break-after: always;
        break-after: page;
        overflow: hidden;
        ${grayscaleFilter}
      }
      .page:last-child { page-break-after: auto; break-after: auto; }
      img { display: block; image-rendering: ${opts.quality === 'high' ? 'pixelated' : 'auto'}; }
    </style></head><body>`)
  doc.close()

  const pxPerMm = S()
  const appendPage = (el) => {
    const clone = el.cloneNode(true)
    clone.removeAttribute('data-v-inspector')
    convertPxToMm(clone, 1 / pxPerMm)
    // 去掉预览用的视觉样式，保证打印干净
    clone.style.boxShadow = ''
    clone.style.margin = '0'
    clone.style.background = 'white'
    doc.body.appendChild(clone)
  }
  for (const el of els) appendPage(el)

  // 等 iframe 内所有图片真正加载完（data:URL 同步完成；外部 URL 等待或超时）
  await waitForImages([doc.body], 3000)

  iframe.contentWindow.focus()
  iframe.contentWindow.print()

  setTimeout(() => document.body.removeChild(iframe), 1000)
  return true
}

function currentPrintOpts() {
  const cfg = project.project.printConfig
  return {
    range: cfg.range || 'all',
    rangeStart: cfg.rangeStart,
    rangeEnd: cfg.rangeEnd,
    copies: cfg.copies || 1,
    collate: !!cfg.collate,
    grayscale: !!cfg.grayscale,
    quality: cfg.quality || 'standard'
  }
}

async function onPrint() {
  const opts = currentPrintOpts()
  const ok = await printPages(opts)
  if (ok) {
    printStore.addHistory({
      type: 'print',
      projectId: project.currentId,
      projectName: project.project.meta.name,
      pages: pagesForTask(opts).length,
      copies: 1,
      detail: rangeLabel(opts)
    })
  }
}

// 当前预览的打印设置加入队列
function addQueue() {
  const opts = currentPrintOpts()
  printStore.addTask({
    projectId: project.currentId,
    projectName: project.project.meta.name,
    range: opts.range,
    rangeStart: opts.rangeStart,
    rangeEnd: opts.rangeEnd,
    copies: 1,
    pages: pagesForTask(opts).length,
    label: rangeLabel(opts)
  })
  toastSuccess(t('已加入打印队列'))
}

// 依次执行当前项目的排队任务（每个任务弹一次系统打印对话框）
async function runQueue() {
  const pid = project.currentId
  const tasks = printStore.queue.filter(t => t.status === 'pending' && t.projectId === pid)
  for (const task of tasks) {
    printStore.updateTask(task.id, { status: 'printing' })
    try {
      const ok = await printPages(task)
      printStore.updateTask(task.id, { status: ok ? 'done' : 'failed' })
      if (ok) {
        printStore.addHistory({
          type: 'print',
          projectId: pid,
          projectName: task.projectName,
          pages: task.pages || pagesForTask(task).length,
          copies: 1,
          detail: task.label || rangeLabel(task)
        })
      }
    } catch (e) {
      printStore.updateTask(task.id, { status: 'failed' })
    }
  }
}

defineExpose({ runQueue })

function convertPxToMm(root, factor) {
  const convert = (el) => {
    if (el.style && el.style.cssText) {
      el.style.cssText = el.style.cssText.replace(/(\d+(\.\d+)?)px/g, (m, v) => {
        return (parseFloat(v) * factor).toFixed(3) + 'mm'
      })
    }
  }
  // 先处理根元素自身（关键：TreeWalker 不含 root）
  convert(root)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let n = walker.nextNode()
  while (n) {
    convert(n)
    n = walker.nextNode()
  }
}

async function onExportPDF() {
  try {
    const fname = (project.project.meta.name || 'label') + '.pdf'
    const n = await exportVectorPDF({
      project: project.project,
      labels: printLabels.value,
      filename: fname
    })
    printStore.addHistory({
      type: 'pdf', projectId: project.currentId, projectName: project.project.meta.name,
      pages: n, copies: 1, detail: '矢量'
    })
    toastSuccess(t('PDF 已导出'))
  } catch (e) {
    toastError(t('导出失败：{msg}', { msg: e?.message || e }))
  }
}

async function onExportImage() {
  const prev = scale.value
  scale.value = 1
  try {
    const els = await settleImages()
    if (!els.length) { toastError(t('没有可导出的内容')); return }
    const fname = (project.project.meta.name || 'label') + '.png'
    await exportElementToImage(els[0], fname)
    printStore.addHistory({
      type: 'image', projectId: project.currentId, projectName: project.project.meta.name,
      pages: 1, copies: 1, detail: '第 1 页'
    })
    toastSuccess(t('图片已导出'))
  } catch (e) {
    toastError(t('导出失败：{msg}', { msg: e?.message || e }))
  } finally {
    scale.value = prev
  }
}
</script>

<style scoped>
.preview-overlay { background: rgba(0,0,0,0.6); }
.preview-modal {
  background: var(--bg);
  border-radius: 8px;
  width: 92vw;
  height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}
.preview-modal .modal-header {
  padding: 10px 16px;
  background: var(--bg-panel);
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.header-title {
  font-weight: 600;
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.header-meta {
  font-weight: 400;
  font-size: 12px;
  color: var(--text-muted);
}
.header-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border-radius: 6px;
  background: var(--bg-soft);
}
.tool-actions { background: transparent; padding: 0; }
.page-input { width: 64px; }
.page-total { color: var(--text-muted); font-size: 12px; }
.zoom-label { font-size: 12px; min-width: 42px; text-align: center; color: var(--text-secondary); }
.more-wrap { position: relative; }
.more-wrap .btn.active { border-color: var(--primary); color: var(--primary); }
.more-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 140px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  padding: 4px;
  z-index: 5;
  display: flex;
  flex-direction: column;
}
.more-item {
  text-align: left;
  padding: 7px 10px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.more-item:hover { background: var(--bg-hover); }
.preview-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}
.pages {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.page { background: white; }
.label { background: white; }
.label-slot { background: transparent; }
.slot-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: #cbd5e1; border: 1px dashed #e2e8f0;
  box-sizing: border-box;
}
.empty-page {
  text-align: center;
  color: var(--text-muted);
  padding: 72px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-page .empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}
.empty-page .empty-sub {
  font-size: 12px;
  max-width: 280px;
  line-height: 1.5;
  margin-bottom: 8px;
}
.export-hidden {
  position: fixed;
  left: -100000px;
  top: 0;
  z-index: -1;
  pointer-events: none;
}
</style>
