<template>
  <header class="site-header">
    <div class="site-header-inner">
      <RouterLink :to="MARKETING_HOME" class="brand" :aria-label="t('签立方首页')">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M4 9h16" />
            <path d="M8 13v3M10.5 12v4M13 13.5v2.5M15.5 12v4" stroke-linecap="round" />
          </svg>
        </span>
        <span class="brand-text">{{ t('签立方') }}</span>
      </RouterLink>
      <nav class="site-nav" :aria-label="t('站点导航')">
        <RouterLink :to="MARKETING_HOME">{{ t('首页') }}</RouterLink>
        <RouterLink to="/templates">{{ t('模板库') }}</RouterLink>
        <RouterLink to="/help">{{ t('帮助') }}</RouterLink>
      </nav>
      <div class="site-actions">
        <button
          type="button"
          class="btn btn-icon theme-toggle"
          @click="settings.toggleTheme()"
          :title="settings.theme === 'dark' ? t('切换到亮色') : t('切换到暗色')"
          :aria-label="settings.theme === 'dark' ? t('切换到亮色') : t('切换到暗色')"
        >
          <span aria-hidden="true">{{ settings.theme === 'dark' ? '☀' : '☾' }}</span>
        </button>
        <RouterLink to="/app" class="btn btn-primary site-cta">{{ t('打开工作台') }}</RouterLink>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'
import { useI18n } from '../../utils/i18n'
import { MARKETING_HOME } from '../../utils/siteNav'

const settings = useSettingsStore()
const { t } = useI18n()
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px);
}
.site-header-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-weight: 700;
  text-decoration: none;
}
.brand-mark {
  color: var(--primary);
  display: flex;
}
.brand-text {
  font-size: 17px;
}
.site-nav {
  display: flex;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
}
.site-nav a {
  padding: 6px 12px;
  border-radius: var(--radius);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
}
.site-nav a.router-link-active {
  color: var(--primary);
  background: rgba(37, 99, 235, 0.1);
}
.site-nav a:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.site-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.theme-toggle {
  min-width: 36px;
}
.site-cta {
  text-decoration: none;
  white-space: nowrap;
}
@media (max-width: 640px) {
  .site-header-inner {
    padding: 8px 12px;
  }
  .site-nav {
    order: 3;
    width: 100%;
  }
}
</style>
