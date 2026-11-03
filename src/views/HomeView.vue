<template>
  <div class="site-page">
    <SiteHeader />
    <main class="site-main">
      <section class="hero-block site-section hero-split">
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
        <div class="hero-visual" aria-hidden="true">
          <div class="hero-glow"></div>
          <TemplatePreviewThumb
            template-id="tpl_grocery_price"
            variant="hero"
            :max-width="300"
            :max-height="210"
            class="hero-specimen"
          />
          <div class="hero-chip">{{ t('超市价签 70×40') }}</div>
        </div>
      </section>

      <section class="site-section">
        <h2>{{ t('三步上手') }}</h2>
        <div class="steps-row">
          <div class="step-card">
            <b>1</b>
            <div>{{ t('选模板') }}</div>
            <p class="site-lede">{{ t('按行业与尺寸挑现成版式') }}</p>
          </div>
          <div class="step-card">
            <b>2</b>
            <div>{{ t('导入表格') }}</div>
            <p class="site-lede">{{ t('一行一条标签，列名自动对上') }}</p>
          </div>
          <div class="step-card">
            <b>3</b>
            <div>{{ t('打印或导出') }}</div>
            <p class="site-lede">{{ t('预览无误后打印、PDF 或热敏指令') }}</p>
          </div>
        </div>
      </section>

      <section class="site-section">
        <h2>{{ t('常见场景') }}</h2>
        <div class="scene-grid">
          <RouterLink
            v-for="s in scenes"
            :key="s.id"
            :to="{ path: '/templates', query: { scene: s.id } }"
            class="scene-card scene-card-rich"
          >
            <TemplatePreviewThumb
              :template-id="s.templateId"
              :max-width="120"
              :max-height="72"
              class="scene-preview"
            />
            <div class="scene-text">
              <strong>{{ t(s.name) }}</strong>
              <span>{{ t(s.blurb) }}</span>
            </div>
          </RouterLink>
        </div>
      </section>

      <section class="site-section">
        <h2>{{ t('已有能力') }}</h2>
        <div class="cap-strip">
          <RouterLink
            v-for="c in HOME_CAPABILITIES"
            :key="c.hash"
            :to="{ path: '/help', hash: `#${c.hash}` }"
          >{{ t(c.label) }}</RouterLink>
        </div>
      </section>

      <section class="site-section">
        <h2>{{ t('为什么放心用') }}</h2>
        <ul class="trust-list">
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
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/site/SiteHeader.vue'
import SiteFooter from '../components/site/SiteFooter.vue'
import TemplatePreviewThumb from '../components/site/TemplatePreviewThumb.vue'
import { SCENE_PACKS } from '../utils/scenePacks'
import { HOME_CAPABILITIES } from '../content/helpChapters'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()

const scenes = SCENE_PACKS.filter((p) =>
  ['retail-price', 'express', 'asset', 'warehouse', 'jewelry', 'apparel'].includes(p.id)
)
</script>

<style scoped>
@import '../styles/site.css';
.hero-split {
  display: grid;
  grid-template-columns: 1fr minmax(240px, 360px);
  gap: 32px;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}
.hero-glow {
  position: absolute;
  inset: 10% 5%;
  background: radial-gradient(ellipse at center, rgba(37, 99, 235, 0.22), transparent 70%);
  pointer-events: none;
}
.hero-specimen {
  position: relative;
  z-index: 1;
  animation: hero-float 5s ease-in-out infinite;
}
.hero-chip {
  position: relative;
  z-index: 1;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
}
.scene-card-rich {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.scene-card-rich :deep(.tpl-thumb) {
  border-bottom: 1px solid var(--border);
}
.scene-text {
  padding: 12px 14px 14px;
}
.scene-text strong {
  display: block;
  margin-bottom: 6px;
}
@keyframes hero-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-specimen { animation: none; }
}
@media (max-width: 860px) {
  .hero-split {
    grid-template-columns: 1fr;
  }
  .hero-visual {
    order: -1;
    min-height: 200px;
  }
}
</style>
