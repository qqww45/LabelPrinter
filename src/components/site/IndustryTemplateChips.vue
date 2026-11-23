<template>
  <div class="industry-chips" data-testid="industry-chips" role="tablist" :aria-label="t('行业分类')">
    <button
      v-for="cat in industryCategories"
      :key="cat.id"
      type="button"
      class="chip"
      :class="{ on: modelValue === cat.id }"
      role="tab"
      :aria-selected="modelValue === cat.id"
      @click="modelValue = cat.id"
    >{{ t(cat.name) }}</button>
    <button
      type="button"
      class="chip"
      :class="{ on: !modelValue }"
      role="tab"
      :aria-selected="!modelValue"
      @click="modelValue = ''"
    >{{ t('全部') }}</button>
  </div>
</template>

<script setup>
import { INDUSTRY_CATEGORIES } from '../../utils/industryTemplates'
import { useI18n } from '../../utils/i18n'

const { t } = useI18n()
const modelValue = defineModel({ type: String, default: '' })

const industryCategories = INDUSTRY_CATEGORIES
</script>

<style scoped>
.industry-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.industry-chips .chip {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-secondary);
  cursor: pointer;
}
.industry-chips .chip:hover {
  background: var(--bg-hover);
}
.industry-chips .chip.on {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(37, 99, 235, 0.08);
}
.industry-chips .chip:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>