<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal preflight-modal">
      <div class="modal-header">
        <span>🩺 {{ t('打印前检查') }}<span class="sub">{{ t('动手前先看一眼，避免打出来才发现问题') }}</span></span>
        <button class="btn btn-icon" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- 概览：这次到底会打出什么 -->
        <div class="summary">
          <div class="summary-item">
            <span class="k">{{ t('标签尺寸') }}</span>
            <span class="v">{{ report.summary.labelText }}</span>
          </div>
          <div class="summary-item">
            <span class="k">{{ t('纸张') }}</span>
            <span class="v">{{ report.summary.paperText }}</span>
          </div>
          <div class="summary-item">
            <span class="k">{{ t('每页标签数') }}</span>
            <span class="v">{{ report.summary.perPage }}</span>
          </div>
          <div class="summary-item">
            <span class="k">{{ t('数据条数') }}</span>
            <span class="v">{{ report.summary.rowCount }}</span>
          </div>
          <div class="summary-item">
            <span class="k">{{ t('将打印') }}</span>
            <span class="v strong">{{ report.summary.pages }} {{ t('页') }}<template v-if="report.summary.copies > 1"> × {{ report.summary.copies }} {{ t('份') }}</template></span>
          </div>
        </div>

        <!-- 问题清单 -->
        <div v-if="report.issues.length" class="issues">
          <div v-for="(it, i) in report.issues" :key="i" class="issue" :class="it.level">
            <div class="issue-head">
              <span class="icon">{{ it.level === 'error' ? '✗' : '⚠' }}</span>
              <span class="title">{{ t(it.title) }}</span>
            </div>
            <div class="issue-detail">{{ t(it.detail) }}</div>
            <button v-if="it.fix !== 'none'" class="btn btn-sm" @click="$emit('fix', it)">
              {{ fixLabel(it) }}
            </button>
          </div>
        </div>

        <div v-else class="all-good">
          <div style="font-size:28px">✅</div>
          <div>{{ t('检查通过，没有发现问题') }}</div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="spacer"></div>
        <button class="btn" @click="$emit('close')">{{ t('返回修改') }}</button>
        <button class="btn btn-primary" :class="{ 'btn-risky': report.hasError }" @click="$emit('proceed')">
          {{ report.hasError ? t('仍然继续') : t('继续打印') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const props = defineProps({
  report: {
    type: Object,
    required: true
  }
})
defineEmits(['close', 'proceed', 'fix'])

function fixLabel(it) {
  if (it.fix === 'field-map') return t('去字段映射')
  if (it.fix === 'import') return t('去导入数据')
  if (it.fix === 'select') return t('定位到该元素')
  return t('去处理')
}
</script>

<style scoped>
.preflight-modal { width: 560px; }
.sub {
  font-weight: normal;
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 8px;
}
.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  margin-bottom: 14px;
  font-size: 12px;
}
.summary-item { display: flex; gap: 6px; }
.summary-item .k { color: var(--text-muted); }
.summary-item .v { color: var(--text-primary); }
.summary-item .v.strong { font-weight: 600; }
.issues { display: flex; flex-direction: column; gap: 10px; }
.issue {
  border-left: 3px solid var(--border);
  padding: 8px 12px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.06);
  font-size: 12px;
}
.issue.error { border-left-color: var(--danger); background: rgba(239, 68, 68, 0.10); }
.issue.warn  { border-left-color: var(--warning); background: rgba(245, 158, 11, 0.10); }
.issue-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  margin-bottom: 4px;
}
.issue.error .issue-head { color: var(--danger); }
.issue.warn .issue-head { color: var(--warning); }
.issue-detail {
  color: var(--text-secondary);
  line-height: 1.65;
  margin-bottom: 8px;
  white-space: pre-wrap;
}
.all-good {
  text-align: center;
  padding: 24px 0;
  color: var(--text-secondary);
  font-size: 13px;
}
.all-good div:last-child { margin-top: 8px; }
.spacer { flex: 1; }
.btn-risky {
  background: var(--danger) !important;
  border-color: var(--danger) !important;
}
</style>
