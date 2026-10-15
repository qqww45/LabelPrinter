<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        🖨️ {{ t('打印设置') }}
        <button class="btn btn-icon" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <fieldset>
          <legend>{{ t('输出') }}</legend>
          <div class="form-row">
            <label>{{ t('打印机') }}</label>
            <select class="input" v-model="form.printer">
              <option value="">{{ t('默认打印机') }}</option>
              <option value="Microsoft Print to PDF">Microsoft Print to PDF</option>
              <option value="OneNote">OneNote</option>
            </select>
          </div>
          <div class="form-row">
            <label>{{ t('份数') }}</label>
            <input class="input" type="number" min="1" v-model.number="form.copies" style="width:80px" />
          </div>
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
      </div>
      <div class="modal-footer">
        <button class="btn" @click="$emit('close')">{{ t('取消') }}</button>
        <button class="btn btn-primary" @click="apply">{{ t('应用') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useProjectStore } from '../stores/project'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const emit = defineEmits(['close'])
const project = useProjectStore()
const form = reactive({
  printer: project.project.printConfig.printer || '',
  copies: project.project.printConfig.copies || 1,
  range: project.project.printConfig.range || 'all',
  rangeStart: project.project.printConfig.rangeStart || 1,
  rangeEnd: project.project.printConfig.rangeEnd || 1,
  collate: project.project.printConfig.collate || false,
  grayscale: project.project.printConfig.grayscale || false,
  quality: project.project.printConfig.quality || 'standard'
})

function apply() {
  Object.assign(project.project.printConfig, form)
  project.markDirty()
  emit('close')
}
</script>

<style scoped>
fieldset { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; margin-bottom: 12px; }
legend { padding: 0 6px; font-size: 12px; color: var(--text-secondary); }
.btn-group { display: flex; gap: 2px; }
.btn-group .btn.active { background: var(--primary); color: white; border-color: var(--primary); }
</style>
