<template>
  <div class="modal-overlay" @mousedown.self="emit('close')">
    <div
      class="modal dialog-loading"
      role="dialog"
      aria-modal="true"
      :aria-busy="!error"
      aria-labelledby="dialog-loading-title"
    >
      <div class="modal-header">
        <span id="dialog-loading-title">{{ title }}</span>
        <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="emit('close')">×</button>
      </div>
      <div class="modal-body loading-body" role="status">
        <span v-if="!error" class="spinner" aria-hidden="true"></span>
        <p>{{ title }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../utils/i18n'

const props = defineProps({
  error: { type: [Object, String, Error], default: null }
})
const emit = defineEmits(['close'])
const { t } = useI18n()

const title = computed(() => (props.error ? t('打开失败，请关闭后重试') : t('正在打开…')))
</script>

<style scoped>
.dialog-loading {
  width: min(320px, 92vw);
  min-width: 0;
}
.loading-body {
  display: flex;
  align-items: center;
  gap: 12px;
}
.loading-body p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}
.spinner {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  animation: dialog-spin 0.7s linear infinite;
}
@keyframes dialog-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
}
</style>
