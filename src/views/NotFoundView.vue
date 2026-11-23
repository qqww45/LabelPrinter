<template>
  <div class="site-page">
    <SiteHeader />
    <main class="site-main site-section">
      <h1>{{ t('页面未找到') }}</h1>
      <p class="site-lede">{{ t('你访问的链接不存在。') }}</p>
      <RouterLink to="/" class="btn btn-primary">{{ t('返回首页') }}</RouterLink>
    </main>
    <SiteFooter />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/site/SiteHeader.vue'
import SiteFooter from '../components/site/SiteFooter.vue'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()

onMounted(() => {
  document.title = '404｜签立方'
  const robots = document.querySelector('meta[name="robots"]')
  if (robots) robots.setAttribute('content', 'noindex,nofollow')
})
</script>