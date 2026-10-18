<template>
  <div
    class="print-config-root"
    :class="{ overlay: !embedded, embed: embedded }"
    @click.self="!embedded && $emit('close')"
  >
    <div class="modal print-shell" :class="{ embedded }">
      <div class="modal-header print-header">
        <div class="header-main">
          <span v-if="!embedded" class="header-title">{{ t('打印设置') }}</span>
          <div class="cfg-tabs" role="tablist" :aria-label="t('打印设置')">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              role="tab"
              class="cfg-tab"
              :class="{ active: activeTab === tab.id }"
              :aria-selected="activeTab === tab.id"
              @click="activeTab = tab.id"
            >{{ t(tab.label) }}</button>
          </div>
        </div>
        <button
          v-if="!embedded"
          class="btn btn-icon"
          type="button"
          :aria-label="t('关闭')"
          @click="$emit('close')"
        >×</button>
      </div>

      <div class="modal-body print-body">
        <!-- 常规参数 -->
        <div v-show="activeTab === 'general'" class="tab-pane" role="tabpanel">
          <fieldset>
            <legend>{{ t('输出') }}</legend>
            <p class="hint">{{ t('打印机在点「打印」后的系统对话框里选。这里选不了具体设备。请关「适应页面」，按纸张实际尺寸。') }}</p>
            <div class="form-row">
              <label for="pc-copies">{{ t('份数') }}</label>
              <input id="pc-copies" class="input" type="number" min="1" v-model.number="form.copies" style="width:80px" />
              <label for="pc-copies-col">{{ t('按列份数') }}</label>
              <select id="pc-copies-col" class="input" v-model="form.copiesColumn">
                <option value="">{{ t('（不用列，用上面的份数）') }}</option>
                <option v-for="h in data.fields" :key="h" :value="h">{{ h }}</option>
              </select>
            </div>
            <p class="hint">{{ t('每条数据按这个数重复，预览里的张数就是实际打印张数。选了按列份数时，以该列为准，小于 1 的行跳过。') }}</p>
            <div class="form-row">
              <label><input type="checkbox" v-model="form.serialEnabled" /> {{ t('打印序号') }}</label>
              <template v-if="form.serialEnabled">
                <label for="pc-serial">{{ t('起始序号') }}</label>
                <input id="pc-serial" class="input" type="number" min="0" v-model.number="form.serialStart" style="width:80px" />
              </template>
            </div>
            <p v-if="form.serialEnabled" class="hint">{{ serialHint }}</p>
          </fieldset>

          <fieldset>
            <legend>{{ t('打印范围') }}</legend>
            <div class="form-row">
              <label>{{ t('范围') }}</label>
              <div class="btn-group">
                <button class="btn btn-sm" type="button" :class="{active: form.range === 'all'}" @click="form.range = 'all'">{{ t('全部') }}</button>
                <button class="btn btn-sm" type="button" :class="{active: form.range === 'current'}" @click="form.range = 'current'">{{ t('当前') }}</button>
                <button class="btn btn-sm" type="button" :class="{active: form.range === 'range'}" @click="form.range = 'range'">{{ t('区间') }}</button>
              </div>
            </div>
            <div v-if="slotMax > 1" class="form-row">
              <label for="pc-start-slot">{{ t('从第几格') }}</label>
              <input
                id="pc-start-slot"
                class="input"
                type="number"
                min="1"
                :max="slotMax"
                :value="startSlot"
                @input="setStartSlot($event.target.value)"
              />
            </div>
            <p v-if="slotMax > 1" class="hint">{{ t('用过的格子留空。预览、打印、PDF 和图片从同一格开始。') }}</p>
            <div v-if="form.range === 'range'" class="form-row">
              <label for="pc-rstart">{{ t('从') }}</label>
              <input id="pc-rstart" class="input" type="number" min="1" v-model.number="form.rangeStart" style="width:80px" />
              <label for="pc-rend">{{ t('到') }}</label>
              <input id="pc-rend" class="input" type="number" min="1" v-model.number="form.rangeEnd" style="width:80px" />
            </div>
          </fieldset>

          <fieldset>
            <legend>{{ t('其他') }}</legend>
            <div class="form-row">
              <label><input type="checkbox" v-model="form.collate" /> {{ t('逐份打印') }}</label>
              <label><input type="checkbox" v-model="form.grayscale" /> {{ t('灰度') }}</label>
            </div>
            <div class="form-row">
              <label for="pc-quality">{{ t('质量') }}</label>
              <select id="pc-quality" class="input" v-model="form.quality">
                <option value="draft">{{ t('草稿') }}</option>
                <option value="standard">{{ t('标准') }}</option>
                <option value="high">{{ t('高质量') }}</option>
              </select>
            </div>
          </fieldset>
        </div>

        <!-- 热敏：常规参数表单 -->
        <div v-show="activeTab === 'thermal'" class="tab-pane" role="tabpanel">
          <fieldset>
            <legend>{{ t('介质') }}</legend>
            <div class="form-row media-row" :class="{ flash: focusField === 'media' }">
              <label>{{ t('走纸') }}</label>
              <div class="btn-group" role="group" :aria-label="t('走纸')">
                <button class="btn btn-sm" type="button" :class="{active: form.media === 'gap'}" @click="pickMedia('gap')">{{ t('间隙') }}</button>
                <button class="btn btn-sm" type="button" :class="{active: form.media === 'mark'}" @click="pickMedia('mark')">{{ t('黑标') }}</button>
                <button class="btn btn-sm" type="button" :class="{active: form.media === 'continuous'}" @click="pickMedia('continuous')">{{ t('连续纸') }}</button>
              </div>
              <div class="legend-wrap">
                <button
                  class="btn btn-sm legend-btn"
                  type="button"
                  :aria-expanded="mediaLegendOpen"
                  :aria-controls="mediaLegendId"
                  :title="t('查看走纸图例')"
                  :aria-label="t('查看走纸图例')"
                  @click="mediaLegendOpen = !mediaLegendOpen"
                >
                  <svg class="legend-ico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4" />
                    <path d="M8 7.2v4.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <circle cx="8" cy="5" r="0.9" fill="currentColor" />
                  </svg>
                  {{ t('图例') }}
                </button>
                <div
                  v-if="mediaLegendOpen"
                  :id="mediaLegendId"
                  class="legend-pop"
                  role="dialog"
                  :aria-label="t('走纸图例')"
                >
                  <button
                    v-for="opt in mediaLegend"
                    :key="opt.id"
                    type="button"
                    class="legend-item"
                    :class="{ active: form.media === opt.id }"
                    @click="pickFromLegend(opt.id)"
                  >
                    <span class="legend-art" aria-hidden="true">
                      <svg v-if="opt.id === 'gap'" viewBox="0 0 88 48" fill="none">
                        <rect x="4" y="10" width="28" height="28" rx="2" class="paper" />
                        <rect x="36" y="10" width="10" height="28" rx="1" class="gap" />
                        <rect x="50" y="10" width="28" height="28" rx="2" class="paper" />
                        <path d="M41 6v4M41 38v4" class="mark-line" />
                      </svg>
                      <svg v-else-if="opt.id === 'mark'" viewBox="0 0 88 48" fill="none">
                        <rect x="18" y="8" width="52" height="32" rx="2" class="paper" />
                        <rect x="18" y="32" width="52" height="8" rx="1" class="bline" />
                        <text x="44" y="26" text-anchor="middle" class="tiny">{{ t('背面') }}</text>
                      </svg>
                      <svg v-else viewBox="0 0 88 48" fill="none">
                        <rect x="6" y="14" width="76" height="20" rx="2" class="paper" />
                        <path d="M28 14v20M46 14v20M64 14v20" class="dash" stroke-dasharray="2 3" />
                      </svg>
                    </span>
                    <strong>{{ t(opt.title) }}</strong>
                    <span>{{ t(opt.hint) }}</span>
                  </button>
                  <button class="btn btn-sm legend-close" type="button" @click="mediaLegendOpen = false">{{ t('收起') }}</button>
                </div>
              </div>
            </div>
            <div v-if="form.media !== 'continuous'" class="form-row" :class="{ flash: focusField === 'gapMm' }">
              <label for="pc-gap">{{ form.media === 'mark' ? t('黑标高度 (mm)') : t('间隙 (mm)') }}</label>
              <input id="pc-gap" class="input" type="number" min="0" step="0.5" v-model.number="form.gapMm" style="width:80px" />
            </div>
            <div class="form-row" :class="{ flash: focusField === 'size' }">
              <label>{{ t('标签尺寸') }}</label>
              <span class="readonly">{{ labelW }}×{{ labelH }} mm</span>
              <span class="hint inline">{{ t('请与驱动纸张一致，边距 0') }}</span>
            </div>
            <div class="form-row">
              <label for="pc-dpi">{{ t('分辨率') }}</label>
              <select id="pc-dpi" class="input" v-model.number="form.dpi">
                <option :value="203">203 dpi</option>
                <option :value="300">300 dpi</option>
              </select>
              <label for="pc-dir">{{ t('出纸方向') }}</label>
              <select id="pc-dir" class="input" v-model.number="form.direction">
                <option :value="1">{{ t('正向') }}</option>
                <option :value="0">{{ t('反向') }}</option>
              </select>
            </div>
          </fieldset>

          <fieldset>
            <legend>{{ t('本机校准') }}</legend>
            <div class="form-row" :class="{ flash: focusField === 'offset' }">
              <label for="pc-ox">{{ t('水平偏移 (mm)') }}</label>
              <input id="pc-ox" class="input" type="number" step="0.1" v-model.number="form.offsetXMm" style="width:80px" />
              <label for="pc-oy">{{ t('垂直偏移 (mm)') }}</label>
              <input id="pc-oy" class="input" type="number" step="0.1" v-model.number="form.offsetYMm" style="width:80px" />
            </div>
            <div class="form-row" :class="{ flash: focusField === 'scale' }">
              <label for="pc-scale">{{ t('缩放 (%)') }}</label>
              <input id="pc-scale" class="input" type="number" min="50" max="150" step="0.5" v-model.number="form.scalePercent" style="width:80px" />
              <button class="btn btn-sm" type="button" @click="resetCalibrate">{{ t('重置') }}</button>
            </div>
            <p class="hint">{{ t('正数向右/下移。偏大略小于 100，偏小略大于 100。记在本机，换项目仍有效。') }}</p>
            <div class="form-row">
              <button class="btn btn-sm" type="button" @click="downloadCalibration('tspl')">{{ t('下载校准签 TSPL') }}</button>
              <button class="btn btn-sm" type="button" @click="downloadCalibration('zpl')">{{ t('下载校准签 ZPL') }}</button>
            </div>
          </fieldset>

          <fieldset>
            <legend>{{ t('指令文件') }}</legend>
            <div class="form-row">
              <button class="btn btn-sm" type="button" @click="downloadCmd('tspl')">{{ t('下载 TSPL') }}</button>
              <button class="btn btn-sm" type="button" @click="downloadCmd('zpl')">{{ t('下载 ZPL') }}</button>
            </div>
            <p class="hint">{{ t('指令是 UTF-8 文本，中文能否打出取决于打印机字库。文件下载到本机，不经过服务器。图片不会写进指令。') }}</p>
          </fieldset>

          <details class="thermal-help">
            <summary>{{ t('热敏打印有问题？') }}</summary>
            <p class="help-intro">{{ t('选一个现象，会跳到对应参数让你改。') }}</p>
            <div
              v-for="item in helpItems"
              :key="item.id"
              class="help-card"
            >
              <div class="help-q">{{ t(item.q) }}</div>
              <ol class="help-steps">
                <li v-for="(s, i) in item.steps" :key="i">{{ t(s) }}</li>
              </ol>
              <button class="btn btn-sm" type="button" @click="goFix(item)">
                {{ t(item.action) }}
              </button>
            </div>
          </details>
        </div>
      </div>

      <div class="modal-footer">
        <button v-if="!embedded" class="btn" type="button" @click="$emit('close')">{{ t('取消') }}</button>
        <button class="btn btn-primary" type="button" @click="apply">
          {{ embedded ? t('应用到预览') : t('应用') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { saveAs } from 'file-saver'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { useI18n } from '../utils/i18n'
import { expandPrintLabels, normalizeStartSlot } from '../utils/printModel'
import { resolveRow } from '../utils/render'
import { buildTSPL, buildZPL } from '../utils/printerCmd'
import { normalizeCalibrate } from '../utils/thermalCalibrate'
import { applyMediaLook, normalizeMedia, clampGapMm } from '../utils/thermalMedia'
import { getPrinterProfile, savePrinterProfile } from '../utils/printerProfile'
import { toast, toastError } from '../utils/toast'

const props = defineProps({
  embedded: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'applied'])

const { t } = useI18n()
const serialHint = computed(() => t('模板里写 {{序号}}，每打一张加 1。'))
const project = useProjectStore()
const data = useDataStore()
const cfg = project.project.printConfig
const profile = getPrinterProfile()

const tabs = [
  { id: 'general', label: '常规' },
  { id: 'thermal', label: '热敏纸' }
]
const activeTab = ref('general')
const focusField = ref('')
const mediaLegendOpen = ref(false)
const mediaLegendId = 'pc-media-legend'
let flashTimer = 0

const mediaLegend = [
  { id: 'gap', title: '间隙', hint: '中间能看见底纸' },
  { id: 'mark', title: '黑标', hint: '翻过来有黑块' },
  { id: 'continuous', title: '连续纸', hint: '一卷没有断开' }
]

const helpItems = [
  {
    id: 'blank',
    q: '多出空白张 / 跳标',
    steps: [
      '先改「走纸」类型（多数价签是间隙）',
      '间隙或黑标高度填实际毫米数',
      '驱动纸张尺寸与标签一致；仍跳纸时在打印机上按「进纸」测纸'
    ],
    action: '去改走纸与间隙',
    field: 'media',
    focusId: 'pc-gap'
  },
  {
    id: 'shift',
    q: '整体偏左 / 偏右 / 偏上 / 偏下',
    steps: [
      '到「本机校准」调水平/垂直偏移',
      '可先重置，再打校准签量偏差',
      '正数向右、向下'
    ],
    action: '去改偏移',
    field: 'offset',
    focusId: 'pc-ox'
  },
  {
    id: 'scale',
    q: '内容偏大或偏小',
    steps: [
      '系统打印对话框关掉「适应页面」，用 100%',
      '热敏优先下载 TSPL / ZPL',
      '仍不对再调「缩放」'
    ],
    action: '去改缩放',
    field: 'scale',
    focusId: 'pc-scale'
  },
  {
    id: 'media',
    q: '不知道选间隙、黑标还是连续纸',
    steps: [
      '两张标签中间能看见底纸 → 间隙',
      '翻到背面有黑色标记 → 黑标',
      '一卷没有断开 → 连续纸'
    ],
    action: '去选走纸类型',
    field: 'media',
    focusId: null
  }
]

const form = reactive({
  printer: cfg.printer || '',
  copies: cfg.copies || 1,
  copiesColumn: cfg.copiesColumn || '',
  serialEnabled: !!cfg.serialEnabled,
  serialStart: cfg.serialStart ?? 1,
  range: cfg.range || 'all',
  rangeStart: cfg.rangeStart || 1,
  rangeEnd: cfg.rangeEnd || 1,
  collate: cfg.collate !== false,
  grayscale: cfg.grayscale || false,
  quality: cfg.quality || 'standard',
  media: normalizeMedia(cfg.media),
  gapMm: cfg.gapMm ?? 2,
  dpi: cfg.dpi || 203,
  direction: cfg.direction ?? 1,
  offsetXMm: profile.offsetXMm,
  offsetYMm: profile.offsetYMm,
  scalePercent: profile.scalePercent
})

function syncProfileToForm() {
  const next = getPrinterProfile()
  form.offsetXMm = next.offsetXMm
  form.offsetYMm = next.offsetYMm
  form.scalePercent = next.scalePercent
}

onMounted(() => window.addEventListener('labelprint-printer-profile', syncProfileToForm))
onBeforeUnmount(() => window.removeEventListener('labelprint-printer-profile', syncProfileToForm))

const labelW = computed(() => Number(project.project.label?.width) || 0)
const labelH = computed(() => Number(project.project.label?.height) || 0)
const slotMax = computed(() => Math.max(1, project.labelsPerPage || 1))
const startSlot = computed(() => normalizeStartSlot(project.project.printConfig?.startSlot, slotMax.value))
function setStartSlot(value) {
  const next = normalizeStartSlot(value, slotMax.value)
  if (project.project.printConfig.startSlot === next) return
  project.project.printConfig.startSlot = next
  project.markDirty()
}

function pickMedia(id) {
  const next = applyMediaLook(id, form)
  form.media = next.media
  form.gapMm = next.gapMm
}

function pickFromLegend(id) {
  pickMedia(id)
  mediaLegendOpen.value = false
}

function flash(field) {
  focusField.value = field || ''
  clearTimeout(flashTimer)
  if (!field) return
  flashTimer = setTimeout(() => {
    if (focusField.value === field) focusField.value = ''
  }, 2200)
}

async function goFix(item) {
  await nextTick()
  flash(item.field)
  const el = item.focusId
    ? document.getElementById(item.focusId)
    : document.querySelector('.media-row')
  el?.focus?.()
  el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
}

function resetCalibrate() {
  const cal = normalizeCalibrate({ offsetXMm: 0, offsetYMm: 0, scalePercent: 100 })
  form.offsetXMm = cal.offsetXMm
  form.offsetYMm = cal.offsetYMm
  form.scalePercent = cal.scalePercent
  toast(t('已重置偏移与缩放，点应用后生效'))
}

function calibrateFromForm() {
  return normalizeCalibrate({
    offsetXMm: form.offsetXMm,
    offsetYMm: form.offsetYMm,
    scalePercent: form.scalePercent
  })
}

function persistPrintAndProfile() {
  const cal = calibrateFromForm()
  form.offsetXMm = cal.offsetXMm
  form.offsetYMm = cal.offsetYMm
  form.scalePercent = cal.scalePercent
  form.gapMm = clampGapMm(form.gapMm, 2)
  savePrinterProfile(cal)
  Object.assign(project.project.printConfig, {
    printer: form.printer,
    copies: form.copies,
    copiesColumn: form.copiesColumn,
    serialEnabled: form.serialEnabled,
    serialStart: form.serialStart,
    range: form.range,
    rangeStart: form.rangeStart,
    rangeEnd: form.rangeEnd,
    collate: form.collate,
    grayscale: form.grayscale,
    quality: form.quality,
    media: form.media,
    gapMm: form.gapMm,
    dpi: form.dpi,
    direction: form.direction
  })
  project.markDirty()
  return cal
}

function apply() {
  persistPrintAndProfile()
  if (props.embedded) {
    toast(t('打印设置已应用到预览'))
    emit('applied')
  } else {
    toast(t('已保存打印设置与本机校准'))
    emit('close')
  }
}

function baseJob(cal, extra = {}) {
  const p = project.project
  return {
    label: p.label,
    media: form.media,
    gapMm: form.gapMm,
    dpi: form.dpi,
    direction: form.direction,
    calibrate: cal,
    ...extra
  }
}

function downloadCmd(kind) {
  try {
    const cal = persistPrintAndProfile()
    const p = project.project
    const labels = expandPrintLabels(data.displayRows, p.printConfig).map(item => ({
      ...item,
      row: resolveRow(item.row, p.dataSource?.fieldMap)
    }))
    const job = baseJob(cal, { components: p.components, labels })
    const text = kind === 'zpl' ? buildZPL(job) : buildTSPL(job)
    const ext = kind === 'zpl' ? '.zpl' : '.tspl'
    saveAs(new Blob([text], { type: 'text/plain;charset=utf-8' }), (p.meta?.name || 'label') + ext)
    toast(t('已下载指令文件'))
  } catch (e) {
    toastError(t('导出失败：{msg}', { msg: e?.message || e }))
  }
}

function downloadCalibration(kind) {
  try {
    const cal = persistPrintAndProfile()
    const p = project.project
    const job = baseJob(cal, {
      calibrationOnly: true,
      components: [],
      labels: [{ row: {} }]
    })
    const text = kind === 'zpl' ? buildZPL(job) : buildTSPL(job)
    const ext = kind === 'zpl' ? '.zpl' : '.tspl'
    saveAs(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
      (p.meta?.name || 'label') + '-calibrate' + ext
    )
    toast(t('已下载校准签'))
  } catch (e) {
    toastError(t('导出失败：{msg}', { msg: e?.message || e }))
  }
}
</script>

<style scoped>
.print-config-root.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  overscroll-behavior: contain;
}
.print-config-root.embed {
  inset: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  background: transparent;
}
.print-shell {
  width: min(560px, 94vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.print-shell.embedded {
  width: 100%;
  max-height: none;
  height: 100%;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: var(--bg);
}
.print-header {
  gap: 12px;
}
.header-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  min-width: 0;
  flex: 1;
}
.header-title { font-weight: 600; }
.cfg-tabs {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
}
.cfg-tab {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.cfg-tab + .cfg-tab { border-left: 1px solid var(--border); }
.cfg-tab.active {
  background: var(--primary);
  color: #fff;
}
.cfg-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
  z-index: 1;
}
.print-body {
  overflow: auto;
  overscroll-behavior: contain;
  flex: 1;
  min-height: 0;
}
.tab-pane { min-height: 0; }

fieldset {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin-bottom: 12px;
}
legend {
  padding: 0 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.btn-group { display: flex; gap: 2px; }
.btn-group .btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.hint {
  margin: 4px 0 8px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
}
.hint.inline {
  margin: 0;
  flex: 1;
  min-width: 140px;
}
.readonly {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.media-row { flex-wrap: wrap; align-items: center; }
.legend-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.legend-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}
.legend-btn[aria-expanded='true'] {
  color: var(--primary);
  border-color: var(--primary);
}
.legend-ico { flex-shrink: 0; }
.legend-pop {
  position: absolute;
  z-index: 20;
  left: 0;
  top: calc(100% + 6px);
  width: min(320px, 78vw);
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-panel);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  gap: 6px;
  overscroll-behavior: contain;
}
.legend-item {
  display: grid;
  grid-template-columns: 72px 1fr;
  grid-template-rows: auto auto;
  column-gap: 8px;
  row-gap: 1px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}
.legend-item:hover { background: var(--bg-hover); }
.legend-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.legend-item.active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, var(--bg));
}
.legend-item strong {
  grid-column: 2;
  font-size: 12px;
  font-weight: 700;
}
.legend-item span:last-child {
  grid-column: 2;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.35;
}
.legend-art {
  grid-row: 1 / span 2;
  display: grid;
  place-items: center;
  width: 72px;
  height: 40px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--bg-hover) 70%, var(--border));
}
.legend-art svg { width: 68px; height: 36px; }
.legend-art .paper { fill: #f4f4f1; stroke: var(--border); stroke-width: 1.2; }
.legend-art .gap { fill: color-mix(in srgb, var(--primary) 22%, transparent); stroke: var(--primary); stroke-width: 1; }
.legend-art .bline { fill: #1a1a1a; }
.legend-art .mark-line { stroke: var(--primary); stroke-width: 1.5; }
.legend-art .dash { stroke: var(--text-muted); stroke-width: 1; }
.legend-art .tiny {
  fill: var(--text-muted);
  font-size: 8px;
  font-family: inherit;
}
.legend-close {
  align-self: flex-end;
  margin-top: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .legend-item { transition: none; }
}

.form-row.flash {
  border-radius: 6px;
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  animation: flash-pulse 0.9s ease 2;
}

.thermal-help {
  margin: 4px 0 8px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 0 10px 8px;
  background: transparent;
  overscroll-behavior: contain;
}
.thermal-help summary {
  cursor: pointer;
  padding: 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  list-style: none;
}
.thermal-help summary::-webkit-details-marker { display: none; }
.thermal-help summary::before {
  content: '▸';
  display: inline-block;
  margin-right: 6px;
  transition: transform 0.12s ease;
}
.thermal-help[open] summary::before { transform: rotate(90deg); }
.thermal-help summary:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
.help-intro {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.help-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  background: var(--bg-panel);
}
.help-q {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.help-steps {
  margin: 0 0 8px;
  padding-left: 1.2em;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.55;
}
.help-steps li + li { margin-top: 2px; }

@media (prefers-reduced-motion: reduce) {
  .thermal-help summary::before { transition: none; }
}

@keyframes flash-pulse {
  0%, 100% { background: color-mix(in srgb, var(--primary) 10%, transparent); }
  50% { background: color-mix(in srgb, var(--primary) 18%, transparent); }
}

@media (prefers-reduced-motion: reduce) {
  .form-row.flash { animation: none; }
}
</style>
