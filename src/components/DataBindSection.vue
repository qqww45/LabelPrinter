<template>
  <div class="data-bind">
    <div class="data-bind-head">
      <span class="data-bind-title">{{ t('数据绑定') }}</span>
      <span v-if="symbologyLabel" class="data-bind-type">{{ symbologyLabel }}</span>
    </div>
    <div class="mode-row" role="group" :aria-label="t('数据绑定')">
      <button
        v-for="m in modes"
        :key="m.id"
        type="button"
        class="mode-btn"
        :class="{ on: dataMode === m.id }"
        @click="setMode(m.id)"
      >{{ t(m.label) }}</button>
    </div>

    <div v-if="dataMode === 'fixed'" class="bind-field-emphasis">
      <label class="bind-field-label">{{ t('固定文本') }}</label>
      <input
        class="input"
        :value="model.text || ''"
        :placeholder="placeholderFixed"
        @input="patch({ text: $event.target.value, binding: '' })"
      />
    </div>

    <div v-if="dataMode === 'field'" class="bind-field-emphasis">
      <label class="bind-field-label">{{ t('绑定字段') }}</label>
      <p class="bind-field-desc">{{ t('与数据列关联后，预览与打印会按行自动填内容') }}</p>
      <select class="input bind-field-select" :value="model.binding || ''" @change="patch({ binding: $event.target.value, dataMode: 'field' })">
        <option value="">{{ t('（不绑定）') }}</option>
        <option v-for="f in fields" :key="f" :value="f">{{ f }}</option>
      </select>
      <p v-if="model.binding && !fieldSet.has(model.binding)" class="hint warn">{{ t('（数据里还没有此列）') }}</p>
    </div>

    <div v-if="dataMode === 'serial'" class="bind-stack">
      <p class="hint">{{ t('按序号规则生成编码内容，不占用打印流水号设置。') }}</p>
      <div class="form-row pair">
        <label>{{ t('起始') }}</label>
        <input class="input num" type="number" :value="model.start ?? 1" @change="patch({ start: +$event.target.value })" />
        <label>{{ t('步长') }}</label>
        <input class="input num" type="number" :value="model.step ?? 1" @change="patch({ step: +$event.target.value })" />
      </div>
      <div class="form-row pair">
        <label>{{ t('前缀') }}</label>
        <input class="input" :value="model.prefix || ''" @input="patch({ prefix: $event.target.value })" />
        <label>{{ t('后缀') }}</label>
        <input class="input" :value="model.suffix || ''" @input="patch({ suffix: $event.target.value })" />
      </div>
      <div class="form-row">
        <label>{{ t('补零位数') }}</label>
        <input class="input num" type="number" min="0" max="12" :value="model.pad ?? 4" @change="patch({ pad: +$event.target.value })" />
      </div>
      <hr class="soft" />
      <select class="input" :value="model.sequenceScope || 'label'" @change="patch({ sequenceScope: $event.target.value, serialSource: 'sequence' })">
        <option value="label">{{ t('每张标签 +步长') }}</option>
        <option value="row">{{ t('每条数据 +步长') }}</option>
      </select>
    </div>

    <div v-if="dataMode === 'batch'" class="bind-stack">
      <label class="bind-field-label">{{ t('批量输入') }}</label>
      <p class="hint">{{ t('每行一条，写入绑定列并自动补足数据行。') }}</p>
      <input class="input" :value="batchColumn" :placeholder="t('列名（可空，自动创建）')" @input="batchColumn = $event.target.value" />
      <textarea class="input area" rows="4" v-model="batchDraft" :placeholder="t('粘贴多行文本…')" />
      <button type="button" class="btn btn-sm" @click="applyBatch">{{ t('写入数据表') }}</button>
      <p v-if="batchMsg" class="hint">{{ batchMsg }}</p>
      <div class="bind-field-emphasis">
        <label class="bind-field-label">{{ t('绑定字段') }}</label>
        <select class="input bind-field-select" :value="model.binding || ''" @change="patch({ binding: $event.target.value, dataMode: 'batch' })">
          <option value="">{{ t('选择字段') }}</option>
          <option v-for="f in fields" :key="f" :value="f">{{ f }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '../utils/i18n'
import { useDataStore } from '../stores/data'
import { normalizeDataMode } from '../utils/dataBindModes'
import { lookup1DSymbology, lookup2DSymbology } from '../utils/symbologyCatalog'
import { toast } from '../utils/toast'

const props = defineProps({
  model: { type: Object, required: true },
  kind: { type: String, default: '' } // barcode | qrcode | text
})
const emit = defineEmits(['patch'])

const { t } = useI18n()
const data = useDataStore()

const modes = [
  { id: 'fixed', label: '固定文本' },
  { id: 'field', label: '绑定表格列' },
  { id: 'serial', label: '生成序号' },
  { id: 'batch', label: '批量输入' }
]

const dataMode = computed(() => normalizeDataMode(props.model))
const fields = computed(() => data.fields)
const fieldSet = computed(() => new Set(data.fields))

const symbologyLabel = computed(() => {
  if (props.kind === 'barcode') return lookup1DSymbology(props.model.format)?.name || props.model.format
  if (props.kind === 'qrcode') return lookup2DSymbology(props.model.format)?.name || 'QR Code'
  return ''
})

const placeholderFixed = computed(() => {
  if (props.kind === 'qrcode') return t('无绑定时的内容')
  if (props.kind === 'barcode') return t('条码内容')
  return t('支持 {{字段}} 与轻量表达式')
})

const batchDraft = ref('')
const batchColumn = ref('')
const batchMsg = ref('')

function patch(p) {
  emit('patch', p)
}

function setMode(id) {
  const p = { dataMode: id, serialSource: id === 'serial' ? 'sequence' : undefined }
  if (id === 'fixed') p.binding = ''
  patch(p)
}

function applyBatch() {
  const lines = batchDraft.value
  const col = batchColumn.value || props.model.binding || ''
  const result = data.applyBatchPaste({ columnName: col, rawText: lines })
  batchMsg.value = t('已写入 {n} 行到「{c}」', { n: result.lines, c: result.column })
  patch({ binding: result.column, dataMode: 'batch' })
  batchColumn.value = result.column
  toast(t('批量数据已写入当前项目'))
}
</script>

<style scoped>
.data-bind {
  border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border));
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  background: color-mix(in srgb, var(--primary) 6%, var(--bg-panel));
}
.data-bind-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.data-bind-title {
  font-weight: 700;
  font-size: 13px;
}
.data-bind-type {
  font-size: 11px;
  color: var(--text-muted);
}
.mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 8px;
}
.mode-btn {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 6px 4px;
  cursor: pointer;
}
.mode-btn.on {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, var(--bg));
}
.bind-stack .form-row {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 6px;
  align-items: center;
  margin: 6px 0;
}
.soft {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 8px 0;
}
.bind-field-emphasis :deep(.bind-field-label) {
  font-weight: 700;
}
.hint.warn { color: var(--warning); }
</style>