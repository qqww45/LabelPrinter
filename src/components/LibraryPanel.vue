<template>
  <div class="library-panel">
    <div class="lib-tabs" role="tablist">
      <button type="button" class="lib-tab" :class="{ on: tab === '1d' }" @click="tab = '1d'">{{ t('一维码') }}</button>
      <button type="button" class="lib-tab" :class="{ on: tab === '2d' }" @click="tab = '2d'">{{ t('二维码') }}</button>
      <button type="button" class="lib-tab" :class="{ on: tab === 'icons' }" @click="tab = 'icons'">{{ t('图标') }}</button>
      <button type="button" class="lib-tab" :class="{ on: tab === 'snippets' }" @click="tab = 'snippets'">{{ t('文案') }}</button>
    </div>

  <div v-show="tab === '1d' || tab === '2d'" class="sym-body">
      <p class="lead">{{ tab === '1d' ? t('点击添加到画布中心') : t('选择二维码类型并添加') }}</p>
      <div v-for="g in activeSymGroups" :key="g.key" class="sym-group">
        <div class="sym-group-title">{{ t(g.name) }}</div>
        <div class="sym-grid">
          <button
            v-for="it in g.items"
            :key="it.id"
            type="button"
            class="sym-tile"
            :title="t(it.hint)"
            @click="addSym(it)"
          >
            <span class="sym-thumb" aria-hidden="true">{{ tab === '1d' ? '▌' : '▣' }}</span>
            <span class="sym-name">{{ it.name }}</span>
            <span class="sym-hint">{{ t(it.hint) }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-show="tab === 'icons'" class="icons-body">
      <input class="input" v-model="iconQuery" :placeholder="t('搜索图标…')" :aria-label="t('搜索图标')" />
      <select class="input" v-model="iconCat" :aria-label="t('分类')">
        <option value="">{{ t('全部分类') }}</option>
        <option v-for="c in iconCategories" :key="c" :value="c">{{ t(c) }}</option>
      </select>
      <div class="sym-grid">
        <button v-for="ic in filteredIcons" :key="ic.id" type="button" class="sym-tile" @click="addIcon(ic)">
          <img class="icon-img" :src="iconPreview(ic)" :alt="ic.name" />
          <span class="sym-name">{{ ic.name }}</span>
        </button>
      </div>
    </div>

    <div v-show="tab === 'snippets'" class="icons-body">
      <input class="input" v-model="snippetQuery" :placeholder="t('搜索文案片段…')" />
      <div class="snippet-list">
        <button
          v-for="s in filteredSnippets"
          :key="s.id"
          type="button"
          class="snippet-item"
          @click="addSnippet(s)"
        >
          <span class="sym-name">{{ t(s.title) }}</span>
          <span class="sym-hint">{{ t(s.category) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../utils/i18n'
import { useProjectStore } from '../stores/project'
import { ONED_SYMBOLOGY_GROUPS, TWOD_SYMBOLOGY_GROUPS } from '../utils/symbologyCatalog'
import { filterIcons, iconCategories as iconCats, iconToDataUrl, iconToPngDataUrl } from '../utils/assetLibrary'
import { filterSnippets } from '../utils/textSnippets'
import { sample1DBarcodeValue, sample2DCodeValue } from '../utils/symbologyCatalog'
import { toast } from '../utils/toast'

const { t } = useI18n()
const project = useProjectStore()

const tab = ref('1d')
const iconQuery = ref('')
const iconCat = ref('')
const snippetQuery = ref('')

const activeSymGroups = computed(() => (tab.value === '2d' ? TWOD_SYMBOLOGY_GROUPS : ONED_SYMBOLOGY_GROUPS))
const iconCategories = computed(() => iconCats())
const filteredIcons = computed(() => filterIcons(iconQuery.value, iconCat.value))
const filteredSnippets = computed(() => filterSnippets(snippetQuery.value))

function iconPreview(ic) {
  return iconToDataUrl(ic)
}

function addSym(it) {
  const type = tab.value === '2d' ? 'qrcode' : 'barcode'
  project.requestAddComponent(type, {
    format: it.id,
    sampleText: type === 'qrcode' ? sample2DCodeValue() : sample1DBarcodeValue(it.id),
    text: type === 'qrcode' ? sample2DCodeValue() : sample1DBarcodeValue(it.id),
    dataMode: 'fixed'
  })
}

async function addIcon(ic) {
  const src = await iconToPngDataUrl(ic)
  if (!src) {
    toast(t('图标加载失败，请重试'))
    return
  }
  project.requestAddComponent('image', {
    src,
    source: 'static',
    name: ic.name
  })
}

function addSnippet(s) {
  project.requestAddComponent('text', {
    text: s.text,
    fontSize: s.fontSize || 9,
    name: s.title
  })
}
</script>

<style scoped>
.library-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow: hidden;
}
.lib-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 0 8px;
}
.lib-tab {
  border: 0;
  border-radius: 6px;
  font-size: 11px;
  padding: 6px 2px;
  background: var(--bg-hover);
  color: var(--text-muted);
  cursor: pointer;
}
.lib-tab.on {
  background: color-mix(in srgb, var(--primary) 14%, var(--bg-panel));
  color: var(--primary);
  font-weight: 600;
}
.lead {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 8px;
}
.sym-body, .icons-body {
  overflow: auto;
  padding: 0 8px 12px;
  flex: 1;
}
.sym-group { margin-bottom: 10px; }
.sym-group-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.sym-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.sym-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  padding: 8px;
  cursor: pointer;
  text-align: left;
}
.sym-tile:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--bg));
}
.sym-thumb { font-size: 16px; }
.sym-name { font-size: 12px; font-weight: 600; }
.sym-hint { font-size: 10px; color: var(--text-muted); line-height: 1.25; }
.icon-img { width: 40px; height: 40px; object-fit: contain; }
.snippet-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.snippet-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  padding: 8px;
  text-align: left;
  cursor: pointer;
}
</style>