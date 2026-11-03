<template>
  <div class="site-page">
    <SiteHeader />
    <main class="site-main">
      <section class="hero-block site-section">
        <h1>{{ t('把表格的每一行，印成可以贴出去的标签') }}</h1>
        <p class="site-lede">
          {{ t('在浏览器里设计价签、面单与资产贴，导入 Excel 或 CSV，批量预览、打印或导出 PDF。数据只留在本机。') }}
        </p>
        <div class="hero-actions">
          <RouterLink to="/templates" class="btn btn-primary">{{ t('从模板开始') }}</RouterLink>
          <RouterLink to="/app" class="btn">{{ t('打开工作台') }}</RouterLink>
          <RouterLink to="/help" class="btn-link">{{ t('使用帮助') }}</RouterLink>
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
            class="scene-card"
          >
            <strong>{{ t(s.name) }}</strong>
            <span>{{ t(s.blurb) }}</span>
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
</style>
