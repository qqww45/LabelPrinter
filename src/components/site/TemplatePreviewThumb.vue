<template>
  <div class="tpl-thumb" :class="variant" :style="wrapStyle" role="img" :aria-label="ariaLabel">
    <div v-if="model" class="tpl-thumb-surface" :style="model.surfaceStyle">
      <div
        v-for="c in model.components"
        :key="c.id"
        class="pv-comp"
        :class="'pv-' + c.type"
        :style="c.style"
      >{{ c.label }}</div>
    </div>
    <div v-else class="tpl-thumb-fallback">{{ t('预览') }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../utils/i18n'
import { buildTemplatePreviewModel, getBuiltinTemplate } from '../../utils/templatePreview'

const props = defineProps({
  templateId: { type: String, default: '' },
  template: { type: Object, default: null },
  maxWidth: { type: Number, default: 160 },
  maxHeight: { type: Number, default: 110 },
  variant: { type: String, default: 'card' },
  ariaLabel: { type: String, default: '' }
})

const { t } = useI18n()

const resolved = computed(() => props.template || getBuiltinTemplate(props.templateId))

const model = computed(() => {
  const tpl = resolved.value
  if (!tpl) return null
  return buildTemplatePreviewModel(tpl, props.maxWidth, props.maxHeight)
})

const wrapStyle = computed(() => {
  if (!model.value) return {}
  return { minHeight: `${Math.min(props.maxHeight, model.value.heightPx + 16)}px` }
})
</script>

<style scoped>
.tpl-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background: color-mix(in srgb, var(--bg) 70%, var(--bg-panel));
  border-bottom: 1px solid var(--border);
}
.tpl-thumb.hero {
  border: none;
  background: transparent;
  padding: 0;
}
.tpl-thumb-surface {
  position: relative;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.18);
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}
[data-theme='dark'] .tpl-thumb-surface {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
}
.pv-comp {
  position: absolute;
  overflow: hidden;
  line-height: 1.1;
  background: rgba(37, 99, 235, 0.07);
  border: 1px solid rgba(37, 99, 235, 0.35);
  border-radius: 2px;
  padding: 0 2px;
  white-space: nowrap;
  color: #0f172a;
}
.pv-qrcode,
.pv-barcode {
  background: repeating-linear-gradient(
    90deg,
    #0f172a 0,
    #0f172a 2px,
    transparent 2px,
    transparent 4px
  );
  border-color: #64748b;
  color: transparent;
}
.pv-table {
  background: rgba(16, 185, 129, 0.12);
  border-color: #10b981;
}
.pv-image {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  border-color: #64748b;
}
.tpl-thumb-fallback {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
