<template>
  <div class="modal-overlay preview-overlay" @click.self="$emit('close')">
    <div class="preview-modal">
      <div class="modal-header">
        <div class="header-left">
          <div class="header-title">
            {{ t('打印预览') }}
            <span class="header-meta">
              ({{ data.displayRows.length || 0 }} {{ t('条') }}<template v-if="labelCount !== (data.displayRows.length || 0)"> · {{ labelCount }} {{ t('张') }}</template> / {{ totalPages }} {{ t('页') }})
            </span>
          </div>
          <div class="preview-tabs" role="tablist" :aria-label="t('预览排版与设置')">
            <button
              type="button"
              role="tab"
              class="tab"
              :class="{ active: activeTab === 'preview' }"
              :aria-selected="activeTab === 'preview'"
              @click="activeTab = 'preview'"
            >{{ t('预览') }}</button>
            <button
              type="button"
              role="tab"
              class="tab"
              :class="{ active: activeTab === 'layout' }"
              :aria-selected="activeTab === 'layout'"
              @click="activeTab = 'layout'"
            >{{ t('排版') }}</button>
            <button
              type="button"
              role="tab"
              class="tab"
              :class="{ active: activeTab === 'settings' }"
              :aria-selected="activeTab === 'settings'"
              @click="activeTab = 'settings'"
            >{{ t('设置') }}</button>
          </div>
        </div>
        <div class="header-tools">
          <template v-if="activeTab === 'preview'">
            <div class="tool-group">
              <input class="input page-input" type="number" :value="currentPage"
                min="1" :max="totalPages" @input="goToPage(+$event.target.value)" />
              <span class="page-total">/ {{ totalPages }}</span>
              <button class="btn btn-sm" type="button" @click="prevPage">←</button>
              <button class="btn btn-sm" type="button" @click="nextPage">→</button>
            </div>
            <div v-if="labelsPerPage > 1" class="tool-group">
              <label for="preview-start-slot">{{ t('从第几格') }}</label>
              <input
                id="preview-start-slot"
                class="input page-input"
                type="number"
                min="1"
                :max="labelsPerPage"
                :value="startSlot"
                :aria-label="t('从第几格')"
                @input="setStartSlot($event.target.value)"
              />
            </div>
            <div class="tool-group">
              <button class="btn btn-sm" type="button" @click="zoomOut">−</button>
              <span class="zoom-label">{{ Math.round(scale*100) }}%</span>
              <button class="btn btn-sm" type="button" @click="zoomIn">+</button>
              <button class="btn btn-sm" type="button" @click="scale = 1" :title="t('真实物理尺寸（1:1）')">1:1</button>
            </div>
          </template>
          <div class="tool-group tool-actions">
            <button class="btn btn-primary" type="button" :disabled="busy" @click="onPrint">{{ t('打印') }}</button>
            <div class="more-wrap">
              <button class="btn" type="button" :disabled="busy" :class="{ active: moreOpen }" @click="moreOpen = !moreOpen">{{ t('更多') }} ▾</button>
              <div v-if="moreOpen" class="more-menu" @click.stop>
                <button class="more-item" type="button" :disabled="busy" @click="runMore('pdf')">{{ t('导出 PDF') }}</button>
                <button class="more-item" type="button" :disabled="busy" @click="runMore('image')">{{ t('导出图片') }}</button>
                <button class="more-item" type="button" :disabled="busy" @click="runMore('queue')" :title="t('按当前打印设置加入队列，稍后依次打印')">{{ t('加入队列') }}</button>
              </div>
            </div>
            <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'preview'" class="tab-panel preview-panel">
        <div class="preview-brief" role="region" :aria-label="t('打印摘要')">
          <div class="brief-facts">
            <div v-for="f in previewBrief.facts" :key="f.key" class="fact">
              <span class="fact-k">{{ t(f.label) }}</span>
              <span class="fact-v" :class="{ accent: f.key === 'pages' || f.key === 'labels' }">{{ f.value }}</span>
            </div>
          </div>
          <div v-if="previewBrief.alerts.length" class="brief-alerts">
            <div
              v-for="(a, i) in previewBrief.alerts"
              :key="a.code + i"
              class="brief-alert"
              :class="a.level"
              role="status"
            >
              <span class="alert-mark" aria-hidden="true">{{ a.level === 'error' ? '!' : '·' }}</span>
              <div class="alert-body">
                <div class="alert-title">{{ t(a.title) }}</div>
                <div class="alert-detail">{{ t(a.detail) }}</div>
              </div>
            </div>
          </div>
          <p v-else class="brief-ok">{{ t('摘要正常：纸张与份数如下，预览比例可用 1:1 对照实物') }}</p>
          <p class="brief-note">{{ t('系统对话框请关「适应页面」，按这一页的实际尺寸。') }}</p>
        </div>

        <div class="preview-body">
          <div class="pages">
            <div v-if="nothingChecked" class="empty-page">
              <div class="empty-title">{{ t('没有勾选要打的行') }}</div>
              <div class="empty-sub">{{ t('在数据表勾上要打的行，预览、打印、PDF 和图片会一起跟上。') }}</div>
            </div>
            <template v-else-if="currentPageData">
              <div class="page-meta">
                {{ t('第 {n}/{m} 页', { n: currentPage, m: totalPages }) }}
                · {{ previewBrief.summary.paperText }}
              </div>
              <div class="page" :style="pageStyle">
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
            </template>
            <div v-else class="empty-page">
              <div class="empty-title">{{ t('还没有可预览的数据') }}</div>
              <div class="empty-sub">{{ t('去底部数据面板导入 Excel/CSV，再回来预览打印') }}</div>
              <button class="btn btn-primary" type="button" @click="$emit('close')">{{ t('去数据面板导入') }}</button>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'layout'" class="tab-panel layout-panel" role="tabpanel">
        <LayoutEditor
          :key="'layout-' + layoutEditorKey"
          embedded
          @applied="onLayoutApplied"
        />
      </div>

      <div v-show="activeTab === 'settings'" class="tab-panel settings-panel" role="tabpanel">
        <PrintConfig
          :key="'print-' + printConfigKey"
          embedded
          @applied="onPrintSettingsApplied"
        />
      </div>

      <div v-if="busy" class="job-mask" role="status" aria-live="polite" aria-busy="true">
        <span class="spinner" aria-hidden="true"></span>
        <p>{{ busyText }}</p>
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
import LayoutEditor from './LayoutEditor.vue'
import PrintConfig from './PrintConfig.vue'
import { renderText, resolveRow, codePayload, isEncodableCode } from '../utils/render'
import { escapeHtmlWithBreaks, safeImageSrc } from '../utils/escapeHtml'
import { expandPrintLabels, paginateLabels, pageForSourceRow, normalizeStartSlot, componentHidden, componentPlainText } from '../utils/printModel'
import { pageBoxStyle, labelAreaStyle } from '../utils/pageBox'
import { buildPreviewBrief } from '../utils/diagnose'
import { exportVectorPDF } from '../utils/vectorPdf'
import { tableColumnWidths, tableRowHeights } from '../utils/tableGeom'
import { MM_TO_PX } from '../utils/canvasFit'
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
const emit = defineEmits(['close', 'consumed'])

const project = useProjectStore()
const data = useDataStore()
const printStore = usePrintStore()

const currentPage = ref(1)
// 默认用设计画布的 zoom，保证"预览所见 = 设计所见"（否则预览比例跟设计画布对不上，用户会以为尺寸错了）
// 预览缩放独立于设计画布，默认 100% 便于看整页
const scale = ref(1)
const pageRefs = ref([])
const moreOpen = ref(false)
const busy = ref(false)
const busyText = ref('')
const activeTab = ref('preview')
const layoutEditorKey = ref(0)
const printConfigKey = ref(0)

watch(activeTab, (tab) => {
  if (tab === 'layout') layoutEditorKey.value += 1
  if (tab === 'settings') printConfigKey.value += 1
})

function onLayoutApplied() {
  toastSuccess(t('排版已应用到预览'))
  activeTab.value = 'preview'
  currentPage.value = 1
}

function onPrintSettingsApplied() {
  activeTab.value = 'preview'
  currentPage.value = 1
}

function runMore(kind) {
  moreOpen.value = false
  if (busy.value) return
  if (kind === 'pdf') onExportPDF()
  else if (kind === 'image') onExportImage()
  else if (kind === 'queue') addQueue()
}

// 先占住 busy，再等一帧把遮罩画出来，避免大文件把主线程占满后转圈才出现
async function withBusy(text, fn) {
  if (busy.value) return false
  busy.value = true
  busyText.value = text
  moreOpen.value = false
  await nextTick()
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  try {
    await fn()
    return true
  } finally {
    busy.value = false
    busyText.value = ''
  }
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
let previewPageReady = false
watch(printLabels, (labels) => {
  if (previewPageReady) return
  previewPageReady = true
  const page = pageForSourceRow(labels, data.activeRowIndex, labelsPerPage.value, project.project.printConfig?.startSlot)
  if (page > 1) currentPage.value = page
}, { immediate: true })
const labelCount = computed(() => data.displayRows.length ? printLabels.value.length : 0)
const nothingChecked = computed(() => data.displayRows.length > 0 && !printLabels.value.length)
const startSlot = computed(() => normalizeStartSlot(project.project.printConfig?.startSlot, labelsPerPage.value))
function setStartSlot(value) {
  const next = normalizeStartSlot(value, labelsPerPage.value)
  if (project.project.printConfig.startSlot === next) return
  project.project.printConfig.startSlot = next
  project.markDirty()
}
const pages = computed(() => paginateLabels(printLabels.value, labelsPerPage.value, startSlot.value))

const totalPages = computed(() => Math.max(1, pages.value.length))
const currentPageData = computed(() => {
  // 允许临时超出范围（导出时 currentPage 被设为 1）
  const idx = Math.min(Math.max(0, currentPage.value - 1), pages.value.length - 1)
  return pages.value[idx]
})

const previewBrief = computed(() => {
  const p = project.project
  return buildPreviewBrief({
    components: p.components || [],
    dataFields: data.fields || [],
    fieldMap: p.dataSource?.fieldMap || {},
    rows: data.displayRows || [],
    label: p.label || {},
    paper: p.paper || {},
    margin: p.margin || {},
    layout: p.layout || {},
    printConfig: p.printConfig || {},
    perPage: labelsPerPage.value,
    labelCount: labelCount.value,
    pageCount: totalPages.value
  })
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
            ? barcodeToCanvas(String(txt), {
              format: c.format || 'CODE128',
              textRatio: c.textRatio,
              targetWidth: Math.max(1, c.width * S() * 3),
              targetHeight: Math.max(1, c.height * S() * 3)
            })
            : qrToCanvas(String(txt), 240)
          const url = cv ? canvasToDataURL(cv) : ''
          if (!url) return null
          inner = h('img', { src: url, style: c.type === 'barcode' ? barcodeImgStyle() : imgStyle(c) })
          break
        }
        case 'rect': {
          inner = h('div', { style: rectStyle(c) })
          break
        }
        case 'ellipse': {
          inner = h('div', { style: ellipseStyle(c) })
          break
        }
        case 'line': {
          inner = h('div', { style: lineStyle(c) })
          break
        }
        case 'date':
        case 'serial':
        case 'checkbox': {
          inner = h('div', { style: textStyle(c) }, componentPlainText(c, row))
          break
        }
        case 'table': {
          const tableH = (Number(c.height) || 0) * S()
          const colW = tableColumnWidths(c, 100)
          const rowH = tableRowHeights(c, tableH)
          const rowsArr = []
          for (let r = 0; r < rowH.length; r++) {
            const tds = []
            for (let col = 0; col < colW.length; col++) {
              tds.push(h('td', { style: tableCellStyle(c, r, col, rowH[r]) }, tableCellNode(c, r, col, row)))
            }
            rowsArr.push(h('tr', { style: { height: rowH[r] + 'px' } }, tds))
          }
          inner = h('table', {
            style: { ...tableBaseStyle(c), height: tableH + 'px' },
            class: 'pv-table'
          }, [
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
// 纸张边距用 page padding（border-box），不用 .label 的 marginTop——
// html2canvas 导 PNG 时会裁掉子元素上边距，预览/PDF 却正常。
const pageStyle = computed(() => pageBoxStyle(
  project.project.paper,
  project.project.margin,
  S(),
  {
    margin: '20px auto',
    background: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
  }
))

const labelStyle = computed(() => labelAreaStyle(
  project.project.paper,
  project.project.margin,
  S(),
  { background: 'white' }
))

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

function imgStyle() {
  return { width: '100%', height: '100%', objectFit: 'fill' }
}

function barcodeImgStyle() {
  return { ...imgStyle(), imageRendering: 'pixelated' }
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

function ellipseStyle(c) {
  const fill = c.fill && c.fill !== 'transparent' && c.fill !== 'none' ? c.fill : 'transparent'
  return {
    width: '100%',
    height: '100%',
    background: fill,
    border: `${(c.strokeWidth || 1) * scale.value}px solid ${c.stroke || '#000'}`,
    borderRadius: '50%',
    boxSizing: 'border-box'
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
  const widths = tableColumnWidths(c, 100)
  return h('colgroup', widths.map((w, i) =>
    h('col', { key: 'col' + i, style: { width: w + '%' } })
  ))
}

function tableCellStyle(c, r = 0, col = 0, rowPx = 0) {
  const bw = (c.borderWidth || 0.2) * S()
  const edge = `${bw}px solid ${c.borderColor || '#333'}`
  const isHeader = r === 0 && !!c.headerRow
  // 每条内边线只归一个格子。collapse 时相邻格子各画一条，html2canvas 会把中间线叠粗。
  return {
    borderTop: r === 0 ? edge : '0',
    borderLeft: col === 0 ? edge : '0',
    borderRight: edge,
    borderBottom: edge,
    boxSizing: 'border-box',
    position: 'relative',
    height: rowPx + 'px',
    maxHeight: rowPx + 'px',
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
    const tableW = (Number(c.width) || 0) * S()
    const tableH = (Number(c.height) || 0) * S()
    const colW = tableColumnWidths(c, tableW)
    const rowH = tableRowHeights(c, tableH)
    const tw = Math.max(1, Math.round((colW[col] || 40) * 2))
    const th = Math.max(1, Math.round((rowH[r] || 20) * 2))
    const key = `${c.id}|${r},${col}|${type}|${value}|${cell.format || ''}|${tw}|${th}`
    if (!cellImgCache.value[key]) {
      const cv = type === 'qrcode'
        ? qrToCanvas(String(value), 240)
        : barcodeToCanvas(String(value), { format: cell.format || 'CODE128', targetWidth: tw, targetHeight: th })
      cellImgCache.value[key] = cv ? canvasToDataURL(cv) : ''
    }
    const src = cellImgCache.value[key]
    if (!src) return ''
    return h('img', { src, style: cellImageStyle(c, type === 'barcode') })
  }

  if (type === 'image') {
    const src = safeImageSrc(value || cell.src || '')
    if (!src) return ''
    return h('img', { src, style: cellImageStyle(c) })
  }

  const align = (r === 0 && c.headerRow) ? 'center' : (c.textAlign || 'left')
  const vAlign = c.vAlign || 'middle'
  return h('div', {
    style: {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
      boxSizing: 'border-box',
      padding: ((c.cellPadding || 1) * S()) + 'px',
      display: 'flex',
      alignItems: vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center',
      justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      lineHeight: '1.2',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      textAlign: align
    }
  }, value)
}

function cellImageStyle(c, crisp = false) {
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
    objectFit: 'contain',
    imageRendering: crisp ? 'pixelated' : 'auto'
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
  // 用完即清，避免关掉后再开预览时把上一次的 pdf/image 又执行一遍
  const kind = props.autoExport
  if (kind === 'pdf' || kind === 'image') {
    emit('consumed')
    await nextTick()
    if (kind === 'pdf') onExportPDF()
    else onExportImage()
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
  if (nothingChecked.value) { toastError(t('没有勾选要打的行')); return }
  await withBusy(t('正在准备打印…'), async () => {
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
  })
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
  if (!tasks.length) return
  await withBusy(t('正在准备打印…'), async () => {
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
  })
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
  if (nothingChecked.value) { toastError(t('没有勾选要打的行')); return }
  await withBusy(t('正在导出 PDF…'), async () => {
    try {
      const fname = (project.project.meta.name || 'label') + '.pdf'
      const n = await exportVectorPDF({
        project: project.project,
        labels: printLabels.value,
        filename: fname,
        onPage: (i, total) => {
          if (total > 1) busyText.value = t('正在导出 PDF… {i}/{n}', { i, n: total })
        }
      })
      printStore.addHistory({
        type: 'pdf', projectId: project.currentId, projectName: project.project.meta.name,
        pages: n, copies: 1, detail: '矢量'
      })
      toastSuccess(t('PDF 已导出'))
    } catch (e) {
      toastError(t('导出失败：{msg}', { msg: e?.message || e }))
    }
  })
}

async function onExportImage() {
  if (busy.value) return
  if (nothingChecked.value) { toastError(t('没有勾选要打的行')); return }
  const prev = scale.value
  const pageNo = currentPage.value
  try {
    await withBusy(t('正在导出图片…'), async () => {
      scale.value = 1
      await nextTick()
      await settleImages()
      const els = pagesForTask({ range: 'current' })
      if (!els.length) { toastError(t('没有可导出的内容')); return }
      const base = project.project.meta.name || 'label'
      const fname = totalPages.value > 1 ? `${base}-p${pageNo}.png` : `${base}.png`
      await exportElementToImage(els[0], fname)
      printStore.addHistory({
        type: 'image', projectId: project.currentId, projectName: project.project.meta.name,
        pages: 1, copies: 1, detail: `第 ${pageNo} 页`
      })
      toastSuccess(t('图片已导出'))
    })
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
  position: relative;
  background: var(--bg);
  border-radius: 8px;
  width: 92vw;
  height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}
.job-mask {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg) 84%, transparent);
  color: var(--text);
  overscroll-behavior: contain;
}
.job-mask p {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  animation: preview-spin 0.7s linear infinite;
}
@keyframes preview-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
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
.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
}
.header-title {
  font-weight: 600;
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.preview-tabs {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  flex: 0 0 auto;
  align-self: flex-start;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
}
.preview-tabs .tab {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  padding: 4px 14px;
  font-size: 12px;
  cursor: pointer;
}
.preview-tabs .tab + .tab { border-left: 1px solid var(--border); }
.preview-tabs .tab.active {
  background: var(--primary);
  color: #fff;
}
.preview-tabs .tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.tab-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.preview-panel { min-height: 0; }
.layout-panel,
.settings-panel {
  min-height: 0;
  overflow: hidden;
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
.more-item:hover:not(:disabled) { background: var(--bg-hover); }
.more-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.more-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.preview-brief {
  flex-shrink: 0;
  padding: 8px 14px 10px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-panel) 88%, var(--bg));
  overscroll-behavior: contain;
  max-height: 38vh;
  overflow: auto;
}
.brief-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}
.fact {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.fact-k {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
.fact-v {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.fact-v.accent { color: var(--primary); }
.brief-ok,
.brief-note {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
.brief-alerts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.brief-alert {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 7px 9px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
}
.brief-alert.error {
  border-color: color-mix(in srgb, var(--danger, #dc2626) 45%, var(--border));
  background: color-mix(in srgb, var(--danger, #dc2626) 10%, var(--bg));
}
.brief-alert.warn {
  border-color: color-mix(in srgb, var(--warning, #b45309) 40%, var(--border));
  background: color-mix(in srgb, var(--warning, #b45309) 10%, var(--bg));
}
.alert-mark {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  margin-top: 1px;
}
.brief-alert.error .alert-mark {
  background: var(--danger, #dc2626);
  color: #fff;
}
.brief-alert.warn .alert-mark {
  background: var(--warning, #b45309);
  color: #fff;
}
.alert-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
}
.alert-detail {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.45;
}
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
.page {
  position: relative;
  background: white;
}
.page-meta {
  align-self: center;
  margin: 0 0 8px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border);
}
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
