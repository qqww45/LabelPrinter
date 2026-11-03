<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal preflight-modal">
      <div class="modal-header">
        <span>🩺 {{ t('打印前检查') }}<span class="sub">{{ t('动手前先看一眼，避免打出来才发现问题') }}</span></span>
        <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
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

        <div v-if="rowFailureRows.length" class="row-triage">
          <div class="triage-head">{{ t('问题行（点行号可跳转）') }}</div>
          <ul class="triage-list">
            <li v-for="f in rowFailureRows" :key="f.rowIndex + f.code">
              <button type="button" class="row-jump" @click="$emit('fix-row', f.rowIndex)">
                {{ t('第 {n} 行', { n: f.rowIndex + 1 }) }}
              </button>
              <span class="triage-text">{{ f.title }} — {{ f.detail }}</span>
            </li>
          </ul>
        </div>

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
        <button
          v-if="rowFailureRows.length"
          type="button"
          class="btn"
          @click="$emit('proceed-ok-only')"
        >{{ t('只打印通过的行') }}</button>
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
defineEmits(['close', 'proceed', 'proceed-ok-only', 'fix', 'fix-row'])

const rowFailureRows = computed(() => {
  const list = props.report?.rowFailures
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const f of list) {
    const k = `${f.rowIndex}:${f.code}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(f)
  }
  return out.slice(0, 24)
})

function fixLabel(it) {
  if (it.fix === 'field-map') return t('去字段映射')
  if (it.fix === 'import') return t('去导入数据')
  if (it.fix === 'select') return t('定位到该元素')
  if (it.fix === 'row') return t('翻到这一行')
  return t('去处理')
}
</script>

<style scoped>
.preflight-modal { width: 560px; max-width: 92vw; }
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
.row-triage {
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: color-mix(in srgb, var(--warning) 8%, var(--bg-panel));
  font-size: 12px;
}
.triage-head { font-weight: 600; margin-bottom: 6px; }
.triage-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 140px;
  overflow: auto;
  overscroll-behavior: contain;
}
.triage-list li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 4px 0;
  border-bottom: 1px dashed var(--border);
}
.triage-list li:last-child { border-bottom: none; }
.row-jump {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--primary);
  color: var(--primary);
  font-size: 11px;
  font-weight: 600;
}
.row-jump:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.triage-text { color: var(--text-secondary); line-height: 1.45; }
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
