<template>
  <div class="site-page templates-page">
    <SiteHeader />
    <main class="site-main">
      <header class="tpl-head">
        <h1>{{ t('模板库') }}</h1>
        <p class="site-lede">{{ t('筛选行业与尺寸，预览字段说明，一键套用进工作台（含示例数据）。') }}</p>
      </header>

      <div class="tpl-layout">
        <aside class="tpl-filters" :aria-label="t('筛选')">
          <label class="filter-label">{{ t('行业场景') }}</label>
          <select v-model="scene" class="input" @change="syncQuery">
            <option value="">{{ t('全部') }}</option>
            <option v-for="o in sceneOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>

          <label class="filter-label">{{ t('标签尺寸') }}</label>
          <select v-model="size" class="input" @change="syncQuery">
            <option value="">{{ t('全部') }}</option>
            <option v-for="o in sizeOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>

          <label class="filter-label">{{ t('用途') }}</label>
          <select v-model="purpose" class="input" @change="syncQuery">
            <option value="">{{ t('全部') }}</option>
            <option v-for="o in purposeOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>

          <label class="filter-label">{{ t('搜索') }}</label>
          <input v-model="search" class="input" type="search" :placeholder="t('名称或字段')" @input="debouncedSync" />
        </aside>

        <div class="tpl-main">
          <div v-if="!filtered.length" class="tpl-empty" role="status">
            {{ t('没有匹配的模板，试试放宽筛选。') }}
          </div>
          <div v-else class="tpl-grid">
            <button
              v-for="entry in filtered"
              :key="entry.templateId"
              type="button"
              class="tpl-card"
              :class="{ active: selected?.templateId === entry.templateId }"
              @click="selected = entry"
            >
              <TemplatePreviewThumb
                :template-id="entry.templateId"
                :max-width="140"
                :max-height="96"
              />
              <div class="tpl-meta">
                <strong>{{ entry.name }}</strong>
                <span>{{ entry.size }} mm · {{ entry.group }}</span>
              </div>
            </button>
          </div>

          <aside v-if="selected" class="tpl-detail">
            <div class="tpl-detail-preview">
              <TemplatePreviewThumb
                :template-id="selected.templateId"
                :max-width="320"
                :max-height="220"
                variant="hero"
              />
            </div>
            <h2>{{ selected.name }}</h2>
            <p>{{ selected.desc }}</p>
            <p class="detail-size">{{ t('尺寸') }}：{{ selected.size }} mm</p>
            <p class="detail-fields">
              <span>{{ t('所需字段') }}：</span>
              {{ selected.fields.join('、') || '—' }}
            </p>
            <button type="button" class="btn btn-primary" @click="applySelected">
              {{ t('使用此模板') }}
            </button>
          </aside>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SiteHeader from '../components/site/SiteHeader.vue'
import SiteFooter from '../components/site/SiteFooter.vue'
import TemplatePreviewThumb from '../components/site/TemplatePreviewThumb.vue'
import {
  filterTemplateCatalog,
  getPurposeFilterOptions,
  getSceneFilterOptions,
  getSizeFilterOptions,
  getTemplateCatalog
} from '../utils/templatesCatalog'
import { SCENE_PACKS } from '../utils/scenePacks'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const catalog = getTemplateCatalog()
const sceneOptions = getSceneFilterOptions()
const sizeOptions = getSizeFilterOptions(catalog)
const purposeOptions = getPurposeFilterOptions()

const scene = ref(route.query.scene || '')
const size = ref(route.query.size || '')
const purpose = ref(route.query.purpose || '')
const search = ref(route.query.q || '')
const selected = ref(null)

const filtered = computed(() =>
  filterTemplateCatalog(catalog, {
    scene: scene.value,
    size: size.value,
    purpose: purpose.value,
    q: search.value
  })
)

watch(filtered, (list) => {
  if (!list.length) {
    selected.value = null
    return
  }
  if (!selected.value || !list.some((e) => e.templateId === selected.value.templateId)) {
    selected.value = list[0]
  }
}, { immediate: true })

watch(
  () => route.query,
  (q) => {
    scene.value = q.scene || ''
    size.value = q.size || ''
    purpose.value = q.purpose || ''
    search.value = q.q || ''
  }
)

let debounceTimer = 0
function debouncedSync() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(syncQuery, 280)
}

function syncQuery() {
  const query = {}
  if (scene.value) query.scene = scene.value
  if (size.value) query.size = size.value
  if (purpose.value) query.purpose = purpose.value
  if (search.value) query.q = search.value
  if (route.query.pick) query.pick = route.query.pick
  router.replace({ query })
}

function applySelected() {
  if (!selected.value) return
  const entry = selected.value
  const pack = SCENE_PACKS.find((p) => p.templateId === entry.templateId)
  const query = {}
  if (route.query.pick === '1') query.pick = '1'
  if (pack) query.applyPack = pack.id
  else query.applyTemplate = entry.templateId
  router.push({ path: '/app', query })
}
</script>

<style scoped>
@import '../styles/site.css';
.tpl-head h1 {
  margin: 0 0 8px;
  font-size: 28px;
}
.tpl-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  align-items: start;
}
.tpl-filters {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: sticky;
  top: 72px;
}
.filter-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}
.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.tpl-card {
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-panel);
  padding: 0;
  cursor: pointer;
  overflow: hidden;
}
.tpl-card.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.tpl-detail-preview {
  margin-bottom: 12px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px dashed var(--border);
}
.tpl-detail-preview :deep(.tpl-thumb) {
  border-bottom: none;
}
.tpl-meta {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}
.tpl-meta strong {
  font-size: 14px;
  color: var(--text);
}
.tpl-detail {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-panel);
}
.tpl-detail h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.detail-fields {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.tpl-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}
@media (max-width: 800px) {
  .tpl-layout {
    grid-template-columns: 1fr;
  }
  .tpl-filters {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
  .filter-label {
    width: 100%;
  }
  .tpl-filters .input {
    flex: 1;
    min-width: 140px;
  }
}
</style>
