<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        🖨️ {{ t('打印设置') }}
        <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <fieldset>
          <legend>{{ t('输出') }}</legend>
          <div class="form-row">
            <span class="hint">{{ t('打印机在点「打印」后的系统对话框里选。这里选不了具体设备。') }}</span>
          </div>
          <div class="form-row">
            <label>{{ t('份数') }}</label>
            <input class="input" type="number" min="1" v-model.number="form.copies" style="width:80px" />
          </div>
          <div class="form-row">
            <label>{{ t('按列份数') }}</label>
            <select class="input" v-model="form.copiesColumn">
              <option value="">{{ t('（不用列，用上面的份数）') }}</option>
              <option v-for="h in data.fields" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>
          <p class="hint">{{ t('每条数据按这个数重复，预览里的张数就是实际打印张数。选了按列份数时，以该列为准，小于 1 的行跳过。') }}</p>
          <div class="form-row">
            <label><input type="checkbox" v-model="form.serialEnabled" /> {{ t('打印序号') }}</label>
          </div>
          <div v-if="form.serialEnabled" class="form-row">
            <label>{{ t('起始序号') }}</label>
            <input class="input" type="number" min="0" v-model.number="form.serialStart" style="width:80px" />
          </div>
          <p v-if="form.serialEnabled" class="hint">{{ serialHint }}</p>
        </fieldset>

        <fieldset>
          <legend>{{ t('打印范围') }}</legend>
          <div class="form-row">
            <label>{{ t('范围') }}</label>
            <div class="btn-group">
              <button class="btn btn-sm" :class="{active: form.range === 'all'}" @click="form.range = 'all'">{{ t('全部') }}</button>
              <button class="btn btn-sm" :class="{active: form.range === 'current'}" @click="form.range = 'current'">{{ t('当前') }}</button>
              <button class="btn btn-sm" :class="{active: form.range === 'range'}" @click="form.range = 'range'">{{ t('区间') }}</button>
            </div>
          </div>
          <div v-if="form.range === 'range'" class="form-row">
            <label>{{ t('从') }}</label>
            <input class="input" type="number" min="1" v-model.number="form.rangeStart" style="width:80px" />
            <label>{{ t('到') }}</label>
            <input class="input" type="number" min="1" v-model.number="form.rangeEnd" style="width:80px" />
          </div>
        </fieldset>

        <fieldset>
          <legend>{{ t('高级') }}</legend>
          <div class="form-row">
            <label><input type="checkbox" v-model="form.collate" /> {{ t('逐份打印') }}</label>
            <label><input type="checkbox" v-model="form.grayscale" /> {{ t('灰度') }}</label>
          </div>
          <div class="form-row">
            <label>{{ t('质量') }}</label>
            <select class="input" v-model="form.quality">
              <option value="draft">{{ t('草稿') }}</option>
              <option value="standard">{{ t('标准') }}</option>
              <option value="high">{{ t('高质量') }}</option>
            </select>
          </div>
        </fieldset>

        <fieldset>
          <legend>{{ t('热敏纸') }}</legend>
          <div class="form-row">
            <label>{{ t('走纸') }}</label>
            <div class="btn-group">
              <button class="btn btn-sm" :class="{active: form.media === 'gap'}" @click="form.media = 'gap'">{{ t('间隙') }}</button>
              <button class="btn btn-sm" :class="{active: form.media === 'mark'}" @click="form.media = 'mark'">{{ t('黑标') }}</button>
              <button class="btn btn-sm" :class="{active: form.media === 'continuous'}" @click="form.media = 'continuous'">{{ t('连续纸') }}</button>
            </div>
          </div>
          <div v-if="form.media !== 'continuous'" class="form-row">
            <label>{{ t('间隙 (mm)') }}</label>
            <input class="input" type="number" min="0" step="0.5" v-model.number="form.gapMm" style="width:80px" />
          </div>
          <div class="form-row">
            <label>{{ t('分辨率') }}</label>
            <select class="input" v-model.number="form.dpi">
              <option :value="203">203 dpi</option>
              <option :value="300">300 dpi</option>
            </select>
            <label>{{ t('出纸方向') }}</label>
            <select class="input" v-model.number="form.direction">
              <option :value="1">{{ t('正向') }}</option>
              <option :value="0">{{ t('反向') }}</option>
            </select>
          </div>
          <div class="form-row">
            <button class="btn btn-sm" @click="downloadCmd('tspl')">{{ t('下载 TSPL') }}</button>
            <button class="btn btn-sm" @click="downloadCmd('zpl')">{{ t('下载 ZPL') }}</button>
          </div>
          <p class="hint">{{ t('指令是 UTF-8 文本，中文能否打出取决于打印机字库。文件下载到本机，不经过服务器。图片不会写进指令。') }}</p>
        </fieldset>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="$emit('close')">{{ t('取消') }}</button>
        <button class="btn btn-primary" @click="apply">{{ t('应用') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { saveAs } from 'file-saver'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { useI18n } from '../utils/i18n'
import { expandPrintLabels } from '../utils/printModel'
import { resolveRow } from '../utils/render'
import { buildTSPL, buildZPL } from '../utils/printerCmd'

const { t } = useI18n()
const serialHint = computed(() => t('模板里写 {{序号}}，每打一张加 1。'))
const emit = defineEmits(['close'])
const project = useProjectStore()
const data = useDataStore()
const cfg = project.project.printConfig
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
  media: cfg.media || 'gap',
  gapMm: cfg.gapMm ?? 2,
  dpi: cfg.dpi || 203,
  direction: cfg.direction ?? 1
})

function apply() {
  Object.assign(project.project.printConfig, form)
  project.markDirty()
  emit('close')
}

function downloadCmd(kind) {
  Object.assign(project.project.printConfig, form)
  project.markDirty()
  const p = project.project
  const labels = expandPrintLabels(data.displayRows, p.printConfig).map(item => ({
    ...item,
    row: resolveRow(item.row, p.dataSource?.fieldMap)
  }))
  const job = {
    label: p.label,
    components: p.components,
    labels,
    media: form.media,
    gapMm: form.gapMm,
    dpi: form.dpi,
    direction: form.direction
  }
  const text = kind === 'zpl' ? buildZPL(job) : buildTSPL(job)
  const ext = kind === 'zpl' ? '.zpl' : '.tspl'
  saveAs(new Blob([text], { type: 'text/plain;charset=utf-8' }), (p.meta?.name || 'label') + ext)
}
</script>

<style scoped>
fieldset { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; margin-bottom: 12px; }
legend { padding: 0 6px; font-size: 12px; color: var(--text-secondary); }
.btn-group { display: flex; gap: 2px; }
.btn-group .btn.active { background: var(--primary); color: white; border-color: var(--primary); }
.hint { margin: 4px 0 8px; font-size: 12px; color: var(--text-muted); line-height: 1.45; }
</style>
