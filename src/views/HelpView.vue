<template>
  <div class="site-page help-page">
    <SiteHeader />
    <main class="site-main help-layout">
      <aside class="help-toc" :aria-label="t('目录')">
        <h1 class="help-title">{{ t('帮助手册') }}</h1>
        <button
          type="button"
          class="toc-toggle btn"
          @click="tocOpen = !tocOpen"
          :aria-expanded="tocOpen ? 'true' : 'false'"
        >{{ tocOpen ? t('收起目录') : t('展开目录') }}</button>
        <nav v-show="tocOpen || !isNarrow" class="toc-list">
          <a
            v-for="ch in HELP_CHAPTERS"
            :key="ch.id"
            :href="`#${ch.id}`"
            :class="{ active: activeId === ch.id }"
            @click="onTocClick"
          >{{ ch.title }}</a>
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
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SiteHeader from '../components/site/SiteHeader.vue'
import SiteFooter from '../components/site/SiteFooter.vue'
import { HELP_CHAPTERS } from '../content/helpChapters'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const route = useRoute()
const tocOpen = ref(false)
const isNarrow = ref(typeof window !== 'undefined' && window.innerWidth < 768)
const activeId = ref('')
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
    { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5] }
  )
  requestAnimationFrame(() => {
    for (const ch of HELP_CHAPTERS) {
      const el = chapterEls.get(ch.id)
      if (el) observer.observe(el)
    }
  })
  if (route.hash) {
    requestAnimationFrame(() => {
      const el = document.querySelector(route.hash)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
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
  grid-template-columns: 240px 1fr;
  gap: 32px;
  align-items: start;
  max-width: 960px;
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
  top: 72px;
  max-height: calc(100vh - 96px);
  overflow: auto;
  overscroll-behavior: contain;
}
.toc-list a {
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--text-secondary);
  text-decoration: none;
}
.toc-list a.active,
.toc-list a:hover {
  background: var(--bg-hover);
  color: var(--primary);
}
.help-chapter {
  margin-bottom: 40px;
  scroll-margin-top: 80px;
}
.help-chapter h2 {
  font-size: 20px;
  margin: 0 0 12px;
}
.help-chapter p {
  margin: 0 0 10px;
  line-height: 1.65;
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
