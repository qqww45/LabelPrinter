<template>
  <div class="left-dock" :class="{ open }">
    <nav class="activity" :aria-label="t('左侧面板')">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="act-btn"
        :class="{ on: open && view === item.id }"
        :title="itemTitle(item)"
        :aria-label="itemTitle(item)"
        :aria-pressed="open && view === item.id"
        @click="toggle(item.id)"
      >
        <span class="act-ico" aria-hidden="true" v-html="item.icon"></span>
        <span v-if="item.badge != null" class="act-badge">{{ item.badge }}</span>
      </button>
    </nav>

    <aside v-if="open" class="dock-panel" :class="{ wide: view === 'ai' }" :aria-label="panelTitle">
      <div class="dock-head">
        <span class="dock-title">{{ panelTitle }}</span>
        <span v-if="panelCount != null" class="dock-count">{{ panelCount }}</span>
        <button type="button" class="dock-close" :title="t('收起面板')" :aria-label="t('收起面板')" @click="open = false">‹</button>
      </div>
      <div class="dock-body">
        <ProjectSidebar
          v-if="view === 'project'"
          embedded
          @new="emit('new')"
          @open="emit('open')"
          @save="emit('save')"
          @save-as="emit('save-as')"
          @switch="id => emit('switch', id)"
        />
        <ComponentPanel v-else-if="view === 'components'" only="components" />
        <ComponentPanel v-else-if="view === 'layers'" only="layers" />
        <FieldBindStrip v-else-if="view === 'fields'" layout="panel" />
        <AIDialog
          v-else-if="view === 'ai'"
          embedded
          @close="open = false"
          @open-settings="emit('open-ai-settings')"
          @applied="n => emit('ai-applied', n)"
        />
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { useI18n } from '../utils/i18n'
import ProjectSidebar from './ProjectSidebar.vue'
import ComponentPanel from './ComponentPanel.vue'
import FieldBindStrip from './FieldBindStrip.vue'
import AIDialog from './AIDialog.vue'

const emit = defineEmits(['new', 'open', 'save', 'save-as', 'switch', 'open-ai-settings', 'ai-applied'])
const { t } = useI18n()
const project = useProjectStore()
const data = useDataStore()

const KEY_OPEN = 'labelprint_left_dock_open'
const KEY_VIEW = 'labelprint_left_dock_view'
const VIEWS = new Set(['project', 'components', 'layers', 'fields', 'ai'])

const open = ref(localStorage.getItem(KEY_OPEN) !== '0')
const savedView = localStorage.getItem(KEY_VIEW)
const view = ref(VIEWS.has(savedView) ? savedView : 'components')

watch(open, v => { try { localStorage.setItem(KEY_OPEN, v ? '1' : '0') } catch {} })
watch(view, v => { try { localStorage.setItem(KEY_VIEW, v) } catch {} })

const S = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

const items = computed(() => [
  {
    id: 'project',
    label: t('项目'),
    badge: project.projects.length,
    icon: S('<path d="M4 6.5h7l1.5 2H20v9.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V6.5z"/>')
  },
  {
    id: 'components',
    label: t('组件'),
    badge: null,
    icon: S('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>')
  },
  {
    id: 'layers',
    label: t('图层'),
    badge: project.project.components.length || null,
    icon: S('<path d="M12 4 4 8.5 12 13l8-4.5L12 4z"/><path d="M4 12.5 12 17l8-4.5"/><path d="M4 16.5 12 21l8-4.5"/>')
  },
  {
    id: 'fields',
    label: t('字段'),
    badge: data.fields.length || null,
    icon: S('<path d="M5 7h14M5 12h10M5 17h12"/><circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none"/>')
  },
  {
    id: 'ai',
    label: t('AI 调整'),
    badge: null,
    icon: S('<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4.5"/><path d="M9.5 12h5"/>')
  }
])

const panelTitle = computed(() => items.value.find(i => i.id === view.value)?.label || '')
const panelCount = computed(() => {
  if (view.value === 'project') return project.projects.length
  if (view.value === 'layers') return project.project.components.length || null
  if (view.value === 'fields') return data.fields.length || null
  return null
})

function itemTitle(item) {
  if (open.value && view.value === item.id) return t('收起「{n}」', { n: item.label })
  return t('打开「{n}」', { n: item.label })
}

function toggle(id) {
  if (open.value && view.value === id) {
    open.value = false
    return
  }
  view.value = id
  open.value = true
}

/** 供顶部「AI 调整」按钮调用 */
function showView(id) {
  if (!VIEWS.has(id)) return
  if (open.value && view.value === id) {
    open.value = false
    return
  }
  view.value = id
  open.value = true
}

defineExpose({ showView, toggle })
</script>

<style scoped>
.left-dock {
  display: flex;
  flex-shrink: 0;
  height: 100%;
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  z-index: 5;
}
.activity {
  width: 44px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  border-right: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-panel) 90%, var(--primary) 10%), var(--bg-panel));
}
.act-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.act-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.act-btn.on {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent);
}
.act-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.act-ico {
  display: inline-flex;
  line-height: 0;
}
.act-ico :deep(svg) { display: block; }
.act-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
  background: var(--primary);
  color: #fff;
  font-variant-numeric: tabular-nums;
}
.dock-panel {
  width: 248px;
  min-width: 248px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-panel);
}
.dock-panel.wide {
  width: 300px;
  min-width: 300px;
}
.dock-head {
  flex-shrink: 0;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--border);
}
.dock-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.dock-count {
  font-size: 10px;
  font-weight: 600;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--bg-soft, var(--bg));
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.dock-close {
  margin-left: auto;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.dock-close:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.dock-close:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.dock-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@media (prefers-reduced-motion: reduce) {
  .act-btn { transition: none; }
}
</style>
