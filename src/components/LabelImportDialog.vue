<template>
  <div class="modal-overlay" data-testid="label-import-dialog" @click.self="$emit('close')">
    <div class="modal import-modal">
      <div class="modal-header">
        <span>{{ t('识别标签图 / PDF') }}</span>
        <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <p class="hint">{{ t('在浏览器本地处理，不上传服务器。结果是可编辑起步版式，请对照原稿微调。') }}</p>
        <p class="hint ocr-note">{{ t('图片 OCR 首次可能在浏览器内下载语言包（不上传您的文件）；失败时用本地启发式布局。PDF 文本优先本地提取。') }}</p>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          :accept="accept"
          data-testid="label-import-file"
          @change="onPick"
        />
        <button class="btn btn-primary pick-btn" type="button" :disabled="busy" data-testid="label-import-pick" @click="fileInput?.click()">
          {{ busy ? t('识别中…') : t('选择图片或 PDF') }}
        </button>
        <ul v-if="warnings.length" class="warn-list">
          <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useProjectStore } from '../stores/project'
import { useI18n } from '../utils/i18n'
import { toastError, toastSuccess } from '../utils/toast'
import { importLabelFile, LABEL_IMPORT_ACCEPT } from '../utils/labelImport'

const emit = defineEmits(['close', 'imported'])
const { t } = useI18n()
const project = useProjectStore()

const fileInput = ref(null)
const busy = ref(false)
const warnings = ref([])
const accept = LABEL_IMPORT_ACCEPT

async function onPick(ev) {
  const file = ev.target?.files?.[0]
  ev.target.value = ''
  if (!file || busy.value) return
  busy.value = true
  warnings.value = []
  try {
    const result = await importLabelFile(file)
    warnings.value = result.warnings || []
    const layout = result.layout
    if (!layout?.components?.length) {
      toastError(t('未能识别出可编辑内容，请换一张更清晰的图片'))
      return
    }
    project.applyTemplate({
      id: 'imported_' + Date.now(),
      name: '识别版式',
      group: '导入',
      desc: '由标签图/PDF 识别生成',
      fields: [],
      ...layout
    })
    toastSuccess(t('已生成 {n} 个组件', { n: String(layout.components.length) }))
    emit('imported', layout)
    emit('close')
  } catch (e) {
    toastError(t('识别失败：{msg}', { msg: e?.message || e }))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.import-modal { max-width: 440px; width: 92vw; }
.hint { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; }
.hint.ocr-note { font-size: 12px; margin-bottom: 12px; }
.pick-btn { width: 100%; }
.warn-list { margin-top: 12px; font-size: 12px; color: var(--warning); padding-left: 18px; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>