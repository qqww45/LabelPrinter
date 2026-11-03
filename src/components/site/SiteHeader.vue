<template>
  <header class="site-header" :class="{ 'nav-open': navOpen }">
    <div class="site-header-inner">
      <RouterLink :to="MARKETING_HOME" class="brand" :aria-label="t('签立方首页')" @click="navOpen = false">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M4 9h16" />
            <path d="M8 13v3M10.5 12v4M13 13.5v2.5M15.5 12v4" stroke-linecap="round" />
          </svg>
        </span>
        <span class="brand-text">{{ t('签立方') }}</span>
      </RouterLink>
      <button
        type="button"
        class="btn btn-icon nav-toggle"
        :aria-expanded="navOpen ? 'true' : 'false'"
        :aria-controls="'site-nav-panel'"
        :aria-label="navOpen ? t('关闭菜单') : t('打开菜单')"
        @click="navOpen = !navOpen"
      >
        <svg v-if="!navOpen" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
        </svg>
      </button>
      <nav id="site-nav-panel" class="site-nav" :aria-label="t('站点导航')">
        <RouterLink :to="MARKETING_HOME" @click="navOpen = false">{{ t('首页') }}</RouterLink>
        <RouterLink to="/templates" @click="navOpen = false">{{ t('模板库') }}</RouterLink>
        <RouterLink to="/help" @click="navOpen = false">{{ t('帮助') }}</RouterLink>
        <RouterLink to="/app" class="nav-cta-mobile btn btn-primary" @click="navOpen = false">{{ t('打开工作台') }}</RouterLink>
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
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'
import { useI18n } from '../../utils/i18n'
import { MARKETING_HOME } from '../../utils/siteNav'

const settings = useSettingsStore()
const { t } = useI18n()
const navOpen = ref(false)
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--bg-panel) 82%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.site-header-inner {
  max-width: 1160px;
  margin: 0 auto;
  padding: 12px 24px;
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
.nav-toggle {
  display: none;
  margin-left: auto;
}
.site-nav {
  display: flex;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
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
.nav-cta-mobile {
  display: none;
  text-decoration: none;
  justify-content: center;
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
@media (max-width: 768px) {
  .site-header-inner {
    padding: 10px 16px;
  }
  .nav-toggle {
    display: inline-flex;
  }
  .site-nav {
    display: none;
    order: 4;
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 8px 0 4px;
    border-top: 1px solid var(--border);
  }
  .site-header.nav-open .site-nav {
    display: flex;
  }
  .site-nav a {
    padding: 10px 12px;
  }
  .nav-cta-mobile {
    display: inline-flex;
    margin-top: 4px;
  }
  .site-actions .site-cta {
    display: none;
  }
  .site-actions {
    margin-left: 0;
  }
}
</style>
