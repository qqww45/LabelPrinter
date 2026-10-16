<template>
  <div class="modal-overlay" @mousedown.self="close" @keydown.esc="close">
    <div
      ref="dialogRef"
      class="modal about"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <span id="about-title">{{ t('关于') }}</span>
        <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="close">×</button>
      </div>
      <div class="modal-body">
        <p class="name">{{ t('标签打印工具') }}</p>
        <p class="ver">{{ t('版本 {v}', { v: version }) }}</p>
        <p class="lead">{{ t('在浏览器里设计标签，按表格批量打印，并导出 PDF 和图片。') }}</p>

        <h3>{{ t('开源') }}</h3>
        <p>{{ t('源代码公开在 GitHub，可以查看、修改和自行部署。') }}</p>
        <a class="repo" :href="repoUrl" target="_blank" rel="noopener noreferrer">{{ repoUrl }}</a>

        <h3>{{ t('安全') }}</h3>
        <ul>
          <li>{{ t('项目和表格保存在这台电脑的浏览器里。没有账号，也不会把这些数据传到工具自己的服务器。') }}</li>
          <li>{{ t('没有统计和埋点。') }}</li>
          <li>{{ t('使用「AI 调整」并填写密钥后，相关内容会发给你选择的服务商。不用 AI 就不会发送。') }}</li>
        </ul>
      </div>
      <div class="modal-footer">
        <button class="btn" type="button" @click="close">{{ t('关闭') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { version } from '../../package.json'
import { useI18n } from '../utils/i18n'

const emit = defineEmits(['close'])
const { t } = useI18n()
const dialogRef = ref(null)
const repoUrl = 'https://github.com/qqww45/LabelPrinter'

function close() {
  emit('close')
}

onMounted(() => {
  dialogRef.value?.focus()
})
</script>

<style scoped>
.about {
  width: min(440px, 92vw);
  min-width: 0;
}
.name {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: var(--text);
}
.ver {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.lead {
  margin: 10px 0 0;
  color: var(--text);
  line-height: 1.55;
}
h3 {
  margin: 16px 0 6px;
  font-size: 13px;
  font-weight: 650;
  color: var(--text);
}
p, li {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}
ul {
  margin: 0;
  padding-left: 1.15em;
}
li + li { margin-top: 6px; }
.repo {
  display: inline-block;
  margin-top: 6px;
  color: var(--primary);
  font-size: 13px;
  word-break: break-all;
}
.repo:hover { color: var(--primary-hover); }
.repo:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
