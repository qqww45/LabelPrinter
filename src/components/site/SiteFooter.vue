<template>
  <footer class="site-footer">
    <div class="site-footer-inner">
      <div class="footer-links">
        <RouterLink :to="MARKETING_HOME">{{ t('首页') }}</RouterLink>
        <RouterLink to="/templates">{{ t('模板库') }}</RouterLink>
        <RouterLink to="/help">{{ t('帮助') }}</RouterLink>
        <RouterLink to="/app">{{ t('工作台') }}</RouterLink>
        <a :href="REPO_URL" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
      <p class="footer-note">{{ t('开源工具，数据只留在本机浏览器；边缘部署，免安装。') }}</p>
      <p class="footer-beian">
        <a
          href="https://beian.miit.gov.cn/#/Integrated/recordQuery"
          target="_blank"
          rel="noopener noreferrer"
          title="工业和信息化部 ICP/IP 地址/域名信息备案管理系统"
        >粤ICP备20041194号-2</a>
      </p>
    </div>
  </footer>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { REPO_URL } from '../../utils/site'
import { useI18n } from '../../utils/i18n'

import { MARKETING_HOME } from '../../utils/siteNav'

const { t } = useI18n()
</script>

<style scoped>
.site-footer {
  margin-top: auto;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  padding: 28px 20px 32px;
}
.site-footer-inner {
  max-width: 1160px;
  margin: 0 auto;
  text-align: center;
  padding: 0 24px;
}
.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 16px;
  margin-bottom: 12px;
}
.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
}
.footer-links a:hover {
  color: var(--primary);
}
.footer-note {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}
.footer-beian {
  margin: 0;
  font-size: 12px;
}
.footer-beian a {
  color: var(--text-muted);
  text-decoration: none;
}
.footer-beian a:hover {
  color: var(--text-secondary);
}
</style>
