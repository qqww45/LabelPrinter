<template>
  <div class="site-page help-page">
    <SiteHeader />
    <main class="site-main help-layout">
      <div class="help-band site-reveal">
        <MarketingImage
          :src="helpBand.src"
          :alt="helpBand.alt"
          aspect="21 / 6"
          :cover="false"
          priority
          radius="16px"
        />
      </div>
      <aside class="help-toc" :aria-label="t('目录')">
        <h1 class="help-title">{{ t('帮助手册') }}</h1>
        <button
          type="button"
          class="toc-toggle btn"
          @click="tocOpen = !tocOpen"
          :aria-expanded="tocOpen ? 'true' : 'false'"
        >{{ tocOpen ? t('收起目录') : t('展开目录') }}</button>
        <nav v-show="tocOpen || !isNarrow" class="toc-list">
          <RouterLink
            v-for="ch in HELP_CHAPTERS"
            :key="ch.id"
            :to="{ path: '/help', hash: `#${ch.id}` }"
            :class="{ active: activeId === ch.id }"
            @click="onTocClick"
          >{{ ch.title }}</RouterLink>
        </nav>
      </aside>
      <article class="help-body">
        <section
          v-for="ch in HELP_CHAPTERS"
          :key="ch.id"
          :id="ch.id"
          class="help-chapter"
          :ref="(el) => setChapterRef(ch.id, el)"
        >
          <h2>{{ ch.title }}</h2>
          <p v-for="(para, i) in ch.body" :key="i">{{ para }}</p>
          <p v-if="ch.links?.length" class="help-links">
            <template v-for="(link, j) in ch.links" :key="j">
              <RouterLink v-if="link.to" :to="link.to">{{ link.label }}</RouterLink>
              <RouterLink v-else-if="link.hash" :to="{ path: '/help', hash: `#${link.hash}` }">{{ link.label }}</RouterLink>
              <span v-if="j < ch.links.length - 1"> · </span>
            </template>
          </p>
        </section>
      </article>
    </main>
    <SiteFooter />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SiteHeader from '../components/site/SiteHeader.vue'
import SiteFooter from '../components/site/SiteFooter.vue'
import MarketingImage from '../components/site/MarketingImage.vue'
import { HELP_CHAPTERS } from '../content/helpChapters'
import { HELP_BAND } from '../content/marketingAssets'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const helpBand = HELP_BAND
const route = useRoute()
const tocOpen = ref(false)
const isNarrow = ref(typeof window !== 'undefined' && window.innerWidth < 768)
const activeId = ref(HELP_CHAPTERS[0]?.id || '')
const chapterEls = new Map()

function setChapterRef(id, el) {
  if (el) chapterEls.set(id, el)
  else chapterEls.delete(id)
}

function onTocClick() {
  if (isNarrow.value) tocOpen.value = false
}

function syncActiveFromHash() {
  const hash = route.hash?.replace(/^#/, '')
  if (hash && HELP_CHAPTERS.some((c) => c.id === hash)) {
    activeId.value = hash
  }
}

let observer = null
let onResize = null

watch(() => route.hash, () => {
  syncActiveFromHash()
})

onMounted(() => {
  syncActiveFromHash()
  onResize = () => { isNarrow.value = window.innerWidth < 768 }
  window.addEventListener('resize', onResize)
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible[0]?.target?.id) activeId.value = visible[0].target.id
    },
    { root: null, rootMargin: '-72px 0px -45% 0px', threshold: [0, 0.15, 0.4] }
  )
  requestAnimationFrame(() => {
    for (const ch of HELP_CHAPTERS) {
      const el = chapterEls.get(ch.id)
      if (el) observer.observe(el)
    }
    if (route.hash) {
      const el = document.querySelector(route.hash)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
})

onBeforeUnmount(() => {
  if (onResize) window.removeEventListener('resize', onResize)
  observer?.disconnect()
})
</script>

<style scoped>
@import '../styles/site.css';
.help-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
  max-width: 1160px;
}
.help-band {
  grid-column: 1 / -1;
}
.help-title {
  font-size: 22px;
  margin: 0 0 12px;
}
.toc-toggle {
  display: none;
  margin-bottom: 8px;
}
.toc-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: 76px;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.toc-list a {
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  display: block;
}
.toc-list a.active,
.toc-list a:hover {
  background: var(--bg-hover);
  color: var(--primary);
}
.help-body {
  min-width: 0;
}
.help-chapter {
  margin-bottom: 40px;
  scroll-margin-top: 88px;
}
.help-chapter h2 {
  font-size: clamp(20px, 2.5vw, 24px);
  margin: 0 0 14px;
  color: var(--text);
}
.help-chapter p {
  margin: 0 0 12px;
  line-height: 1.65;
  font-size: 16px;
  color: var(--text-secondary);
}
.help-links a {
  color: var(--primary);
  text-decoration: none;
}
.help-links a:hover {
  text-decoration: underline;
}
@media (max-width: 767px) {
  .help-layout {
    grid-template-columns: 1fr;
  }
  .toc-toggle {
    display: inline-flex;
  }
  .toc-list {
    position: static;
    max-height: none;
    margin-bottom: 16px;
  }
}
</style>
