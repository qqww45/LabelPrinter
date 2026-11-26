<template>
  <div class="site-page seo-static-page">
    <SiteHeader />
    <main class="site-main site-section" v-html="bodyHtml"></main>
    <SiteFooter />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from '../components/site/SiteHeader.vue'
import SiteFooter from '../components/site/SiteFooter.vue'
import { renderStaticBodyHtml } from '../content/seoStatic.js'
import { useSettingsStore } from '../stores/settings'
import { setI18nLang } from '../utils/i18n'

const route = useRoute()
const settings = useSettingsStore()

const bodyHtml = computed(() => {
  const inner = renderStaticBodyHtml(route.path)
  if (!inner) return '<p>页面未找到。</p>'
  // 去掉外层 article 包裹，避免重复 id
  return inner.replace(/^\s*<article[^>]*>|<\/article>\s*$/g, '').trim()
})

watch(
  () => route.path,
  (path) => {
    if (path === '/en' && settings.lang !== 'en') {
      settings.lang = 'en'
      setI18nLang('en')
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.seo-static-page :deep(.seo-static-main) {
  position: static;
  width: auto;
  height: auto;
  clip: auto;
  overflow: visible;
  white-space: normal;
  margin: 0;
  padding: 0;
  max-width: none;
}

.seo-static-page :deep(.seo-hero h1) {
  font-size: clamp(1.5rem, 3vw, 2rem);
  margin: 0 0 0.75rem;
}

.seo-static-page :deep(.seo-lede) {
  color: var(--text-secondary);
}

.seo-static-page :deep(.seo-actions a) {
  margin-right: 1rem;
  color: var(--primary);
}

.seo-static-page :deep(.seo-block) {
  margin-top: 2rem;
}

.seo-static-page :deep(.seo-list),
.seo-static-page :deep(.seo-steps) {
  padding-left: 1.25rem;
}

.seo-static-page :deep(.seo-faq-item) {
  margin: 0.75rem 0;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.seo-static-page :deep(.seo-faq-item h3) {
  display: inline;
  font-size: 1rem;
  margin: 0;
  font-weight: 600;
}

.seo-static-page :deep(#seo-product-shots) {
  display: none;
}

.seo-static-page :deep(.seo-breadcrumb) {
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.seo-static-page :deep(.seo-breadcrumb ol) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.seo-static-page :deep(.seo-breadcrumb li:not(:last-child)::after) {
  content: '/';
  margin-left: 0.5rem;
  color: var(--text-muted);
}

.seo-static-page :deep(.seo-breadcrumb a) {
  color: var(--primary);
}
</style>