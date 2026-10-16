<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal map-modal">
      <div class="modal-header">
        <span>🔀 {{ t('字段映射') }} <span class="sub">{{ t('模板字段 ← 数据源字段') }}</span></span>
        <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div v-if="!data.fields.length" class="tip warn">
          {{ t('还没有数据源，请先在底部数据面板导入 Excel / CSV。') }}
        </div>
        <div v-else-if="!templateFields.length" class="tip">
          {{ t('当前模板没有引用任何字段。拖一个「数据字段」到画布上即可。') }}
        </div>

        <template v-else>
          <div class="tip">
            {{ t('模板中用了 {n} 个字段，', { n: templateFields.length }) }}
            <b :class="{ bad: unmapped.length }">{{ t('未匹配 {n} 个', { n: unmapped.length }) }}</b>
            {{ t('映射后画布、预览、打印、导出会立即生效。') }}
          </div>

          <table class="map-table">
            <thead>
              <tr>
                <th>{{ t('模板字段') }}</th>
                <th>{{ t('数据源字段') }}</th>
                <th>{{ t('状态') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.name">
                <td><code>{{ row.name }}</code></td>
                <td>
                  <select
                    class="input"
                    :value="fieldMap[row.name] || ''"
                    @change="setMap(row.name, $event.target.value)"
                  >
                    <option value="">{{ t('（不映射，按同名取）') }}</option>
                    <option v-for="f in data.fields" :key="f" :value="f">{{ f }}</option>
                  </select>
                </td>
                <td class="status">
                  <span v-if="row.ok" class="ok">✓ {{ t('已就绪') }}</span>
                  <span v-else class="warn">⚠ {{ t('数据里没有此字段') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="autoMatch" :disabled="!data.fields.length">{{ t('自动匹配同名') }}</button>
        <button class="btn" @click="clearAll">{{ t('清空映射') }}</button>
        <div class="spacer"></div>
        <button class="btn btn-primary" @click="$emit('close')">{{ t('完成') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { extractTemplateFields, autoMatchFieldMap } from '../utils/render'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
defineEmits(['close'])

const project = useProjectStore()
const data = useDataStore()

const fieldMap = computed(() => project.project.dataSource.fieldMap || {})
const templateFields = computed(() => extractTemplateFields(project.project.components))

const rows = computed(() => templateFields.value.map(name => {
  const mapped = fieldMap.value[name]
  const ok = !!(mapped && data.fields.includes(mapped)) || (!mapped && data.fields.includes(name))
  return { name, ok }
}))

const unmapped = computed(() => rows.value.filter(r => !r.ok).map(r => r.name))

function setMap(name, value) {
  const next = { ...fieldMap.value }
  if (value) next[name] = value
  else delete next[name]
  project.updateFieldMap(next)
}

function autoMatch() {
  project.updateFieldMap(autoMatchFieldMap(templateFields.value, data.fields, fieldMap.value))
}

function clearAll() {
  project.updateFieldMap({})
}

// 打开时自动匹配一次同名字段（不覆盖已有映射）
onMounted(() => {
  if (data.fields.length) autoMatch()
})
</script>

<style scoped>
.map-modal { width: 640px; }
.sub {
  font-weight: normal;
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 8px;
}
.tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.6;
}
.tip.warn { color: var(--warning); }
.tip .bad { color: var(--warning); }
.map-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.map-table th,
.map-table td {
  border: 1px solid var(--border);
  padding: 6px 8px;
  text-align: left;
}
.map-table th {
  background: var(--bg);
  font-weight: 600;
}
.map-table td:nth-child(2) { width: 240px; }
.status { white-space: nowrap; }
.ok { color: var(--success); }
.warn { color: var(--warning); }
.spacer { flex: 1; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
