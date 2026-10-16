<template>
  <div class="toolbar" :class="{ compact: isCompact }">
    <div class="group group-brand">
      <div class="logo">
        <span class="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M4 9h16" />
            <path d="M8 13v3M10.5 12v4M13 13.5v2.5M15.5 12v4" stroke-linecap="round" />
          </svg>
        </span>
        <span class="logo-text">{{ t('标签打印工具') }}</span>
      </div>
      <span class="filename" v-if="project.project.meta">
        <span class="filename-text">{{ project.project.meta.name }}</span>
        <span v-if="project.dirty" class="dirty">●</span>
      </span>
    </div>

    <div class="divider divider-hide-narrow" />

    <!-- 主路径：纸张 · 预览 · 打印 · 导出 -->
    <div class="group group-main">
      <button class="btn" type="button" @click="$emit('paper-config')" :title="t('纸张与标签尺寸')">
        <span class="ico" v-html="icons.paper"></span><span class="txt">{{ t('纸张') }}</span>
      </button>
      <button class="btn keep-label" type="button" @click="$emit('preview')" :title="t('预览')">
        <span class="ico" v-html="icons.preview"></span><span class="txt">{{ t('预览') }}</span>
      </button>
      <button class="btn btn-primary keep-label" type="button" @click="$emit('print')" :title="t('打印')">
        <span class="ico" v-html="icons.print"></span><span class="txt">{{ t('打印') }}</span>
      </button>
      <button class="btn" type="button" @click="$emit('export-pdf')" :title="t('导出 PDF')">
        <span class="ico" v-html="icons.pdf"></span><span class="txt">PDF</span>
      </button>
      <button class="btn" type="button" @click="$emit('export-image')" :title="t('导出图片')">
        <span class="ico" v-html="icons.image"></span><span class="txt">{{ t('图片') }}</span>
      </button>
    </div>

    <div class="divider divider-hide-narrow" />

    <!-- 次要入口收进「更多」 -->
    <div class="group group-more">
      <div class="more-wrap">
        <button
          class="btn"
          type="button"
          :aria-expanded="moreOpen"
          aria-haspopup="menu"
          @click.stop="moreOpen = !moreOpen"
        >
          <span class="ico" v-html="icons.more"></span>
          <span class="txt">{{ t('更多') }}</span>
          <span class="caret" aria-hidden="true">▾</span>
        </button>
        <div v-if="moreOpen" class="more-menu" role="menu" @click.stop>
          <button type="button" class="more-item" role="menuitem" @click="pickMore('template-library')">
            <span class="ico" v-html="icons.library"></span>{{ t('模板库') }}
          </button>
          <button type="button" class="more-item" role="menuitem" @click="pickMore('ai')">
            <span class="ico" v-html="icons.ai"></span>{{ t('AI 调整') }}
          </button>
          <button type="button" class="more-item" role="menuitem" @click="pickMore('field-map')">
            <span class="ico" v-html="icons.map"></span>{{ t('字段映射') }}
          </button>
          <button type="button" class="more-item" role="menuitem" @click="pickMore('layout-editor')">
            <span class="ico" v-html="icons.layout"></span>{{ t('排版') }}
          </button>
          <button type="button" class="more-item" role="menuitem" @click="pickMore('print-config')">
            <span class="ico" v-html="icons.printSetup"></span>{{ t('打印设置') }}
          </button>
          <button type="button" class="more-item" role="menuitem" @click="pickMore('print-center')">
            <span class="ico" v-html="icons.queue"></span>{{ t('打印中心') }}
          </button>
        </div>
      </div>
    </div>

    <div class="spacer" />

    <div class="group group-prefs">
      <button
        class="btn btn-icon"
        type="button"
        @click="settings.toggleTheme()"
        :title="settings.theme === 'dark' ? t('切换到亮色') : t('切换到暗色')"
        :aria-label="settings.theme === 'dark' ? t('切换到亮色') : t('切换到暗色')"
      >
        <span class="ico" aria-hidden="true" v-html="settings.theme === 'dark' ? icons.sun : icons.moon"></span>
      </button>
      <button
        class="btn btn-icon"
        type="button"
        @click="settings.toggleLang()"
        :title="settings.lang === 'en' ? t('切换到中文') : t('Switch to English')"
        :aria-label="settings.lang === 'en' ? t('切换到中文') : t('Switch to English')"
      >
        {{ settings.lang === 'en' ? '中' : 'EN' }}
      </button>
    </div>
    <div v-if="moreOpen" class="more-mask" @click="moreOpen = false"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../utils/i18n'

const project = useProjectStore()
const settings = useSettingsStore()
const { t } = useI18n()

const emit = defineEmits([
  'import-data',
  'paper-config', 'print-config', 'layout-editor', 'preview', 'print', 'export-pdf', 'export-image',
  'template-library', 'field-map', 'print-center', 'ai'
])

const moreOpen = ref(false)
function pickMore(ev) {
  moreOpen.value = false
  emit(ev)
}

const S = (d) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const icons = {
  library: S('<path d="M4 5h5v14H4zM10 5h5v14h-5zM16 7h4v12h-4z"/><path d="M6.5 8h1M6.5 11h1M12.5 8h1M12.5 11h1"/>'),
  ai: S('<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4.5"/><path d="M9.5 12h5"/>'),
  map: S('<path d="M4 7h7l2 3h7"/><path d="M7 17h10"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>'),
  paper: S('<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  layout: S('<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 9h17M10 9v11"/>'),
  printSetup: S('<path d="M7 9V4.5h10V9"/><rect x="5" y="9" width="14" height="8" rx="1.5"/><path d="M8 17v2.5h8V17M8 12h3"/>'),
  queue: S('<path d="M5 6h10v12H5z"/><path d="M9 6V4.5h10V16.5H15"/><path d="M7.5 10h5M7.5 13h5"/>'),
  preview: S('<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  print: S('<path d="M7 9V4.5h10V9"/><rect x="5" y="9" width="14" height="8" rx="1.5"/><path d="M8 17v2.5h8V17"/>'),
  pdf: S('<path d="M8 3.5h6l4 4V20.5H8z"/><path d="M14 3.5V8h4"/><path d="M10 13h4M10 16h6"/>'),
  image: S('<rect x="4" y="5" width="16" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 16.5l4.5-4.5 3 3 3-4 4.5 5.5"/>'),
  more: S('<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
  sun: S('<circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>'),
  moon: S('<path d="M16.5 14.2A6.2 6.2 0 0 1 9.8 7.5 6.5 6.5 0 1 0 16.5 14.2z"/>')
}

const COMPACT_THRESHOLD = 900
const isCompact = ref(typeof window !== 'undefined' && window.innerWidth < COMPACT_THRESHOLD)
function onResize() { isCompact.value = window.innerWidth < COMPACT_THRESHOLD }

onMounted(() => { window.addEventListener('resize', onResize) })
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.toolbar {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border);
  gap: 4px;
  flex-shrink: 0;
  min-height: 48px;
  flex-wrap: wrap;
  row-gap: 4px;
}
.group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.group-main {
  padding: 2px 6px;
  border-radius: 8px;
  background: var(--bg-soft);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}

.logo {
  font-weight: 600;
  margin-right: 8px;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}
.logo-text { white-space: nowrap; }
.filename {
  color: var(--text-secondary);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.filename-text {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dirty { color: var(--warning); }
.spacer { flex: 1; }

.btn { display: inline-flex; align-items: center; gap: 5px; }
.btn .ico {
  display: inline-flex;
  width: 15px;
  height: 15px;
  align-items: center;
  justify-content: center;
  line-height: 0;
  opacity: 0.92;
}
.btn .ico :deep(svg) { display: block; }
.btn .txt { white-space: nowrap; }
.caret { font-size: 10px; opacity: 0.7; margin-left: -2px; }

.more-wrap { position: relative; z-index: 30; }
.more-mask { position: fixed; inset: 0; z-index: 20; }
.more-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 31;
  min-width: 168px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px color-mix(in srgb, #000 14%, transparent);
  overscroll-behavior: contain;
}
.more-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}
.more-item:hover { background: var(--bg-hover); }
.more-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}
.more-item .ico { opacity: 0.85; color: var(--text-secondary); }

.toolbar.compact .logo-text,
.toolbar.compact .filename-text { display: none; }
.toolbar.compact .btn .txt { display: none; }
.toolbar.compact .btn.keep-label .txt { display: inline; }
.toolbar.compact .caret { display: none; }
.toolbar.compact .divider-hide-narrow { display: none; }
.toolbar.compact .group-main { background: transparent; border: 0; padding: 0; }
.toolbar.compact .btn { padding: 4px 6px; }
</style>
