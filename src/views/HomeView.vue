<template>
  <div class="site-page">
    <SiteHeader />
    <main class="site-main">
      <section class="hero-block site-section hero-split site-reveal">
        <div class="hero-copy">
          <p class="hero-kicker">{{ t('表格一行 · 标签一张') }}</p>
          <h1>{{ t('把表格的每一行，印成可以贴出去的标签') }}</h1>
          <p class="site-lede">
            {{ t('在浏览器里设计价签、面单与资产贴，导入 Excel 或 CSV，批量预览、打印或导出 PDF。数据只留在本机。') }}
          </p>
          <div class="hero-actions">
            <RouterLink to="/templates" class="btn btn-primary">{{ t('从模板开始') }}</RouterLink>
            <RouterLink to="/app" class="btn">{{ t('打开工作台') }}</RouterLink>
            <RouterLink to="/help" class="btn-link">{{ t('使用帮助') }}</RouterLink>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-photo-wrap" :class="{ 'hero-float': !reducedMotion }">
            <MarketingImage
              :src="heroAsset.src"
              :alt="heroAsset.alt"
              aspect="4 / 3"
              priority
              radius="18px"
            />
            <span class="hero-chip-overlay">{{ t('超市价签 70×40') }}</span>
          </div>
        </div>
      </section>

      <section class="site-section site-reveal">
        <h2>{{ t('三步上手') }}</h2>
        <div class="steps-row">
          <div v-for="step in steps" :key="step.n" class="step-card">
            <div class="step-card-photo">
              <MarketingImage
                :src="step.asset.src"
                :alt="step.asset.alt"
                aspect="16 / 10"
                radius="0"
              />
            </div>
            <div class="step-card-body">
              <b>{{ step.n }}</b>
              <div>{{ t(step.title) }}</div>
              <p class="site-lede">{{ t(step.desc) }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="site-section site-section--band site-reveal">
        <h2>{{ t('常见场景') }}</h2>
        <div class="scene-grid">
          <RouterLink
            v-for="s in scenes"
            :key="s.id"
            :to="{ path: '/templates', query: { scene: s.id } }"
            class="scene-card"
          >
            <div class="scene-card-photo">
              <MarketingImage
                :src="sceneAsset(s.id).src"
                :alt="sceneAsset(s.id).alt"
                aspect="4 / 3"
                radius="0"
              />
            </div>
            <div class="scene-text">
              <strong>{{ t(s.name) }}</strong>
              <span>{{ t(s.blurb) }}</span>
            </div>
          </RouterLink>
        </div>
      </section>

      <section class="site-section site-reveal">
        <h2>{{ t('已有能力') }}</h2>
        <div class="cap-strip">
          <RouterLink
            v-for="c in HOME_CAPABILITIES"
            :key="c.hash"
            :to="{ path: '/help', hash: `#${c.hash}` }"
          >{{ t(c.label) }}</RouterLink>
        </div>
      </section>

      <section class="site-section site-reveal">
        <h2>{{ t('为什么放心用') }}</h2>
        <ul class="trust-grid">
          <li>{{ t('开源可审计，代码在 GitHub') }}</li>
          <li>{{ t('项目与表格保存在本机浏览器，无需注册') }}</li>
          <li>{{ t('官方站点边缘部署，打开即用') }}</li>
        </ul>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/site/SiteHeader.vue'
import SiteFooter from '../components/site/SiteFooter.vue'
import MarketingImage from '../components/site/MarketingImage.vue'
import { SCENE_PACKS } from '../utils/scenePacks'
import { HOME_CAPABILITIES } from '../content/helpChapters'
import { HERO, resolveMarketingAsset } from '../content/marketingAssets'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()

const heroAsset = HERO
const reducedMotion = ref(false)

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const steps = [
  { n: 1, title: '选模板', desc: '按行业与尺寸挑现成版式', asset: resolveMarketingAsset('step', 1) },
  { n: 2, title: '导入表格', desc: '一行一条标签，列名自动对上', asset: resolveMarketingAsset('step', 2) },
  { n: 3, title: '打印或导出', desc: '预览无误后打印、PDF 或热敏指令', asset: resolveMarketingAsset('step', 3) }
]

const scenes = SCENE_PACKS.filter((p) =>
  ['retail-price', 'express', 'asset', 'warehouse', 'jewelry', 'apparel'].includes(p.id)
)

function sceneAsset(id) {
  return resolveMarketingAsset('scene', id)
}
</script>

<style scoped>
@import '../styles/site.css';
.hero-split {
  display: grid;
  grid-template-columns: 1fr minmax(280px, 420px);
  gap: 40px;
  align-items: center;
  padding-top: 8px;
}
.hero-kicker {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 10px;
  letter-spacing: 0.04em;
}
.hero-visual {
  position: relative;
}
.hero-float {
  animation: hero-float 6s ease-in-out infinite;
}
@keyframes hero-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-float { animation: none; }
}
@media (max-width: 860px) {
  .hero-split {
    grid-template-columns: 1fr;
  }
  .hero-visual {
    order: -1;
  }
}
</style>
