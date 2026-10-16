<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal tpl-modal">
      <div class="modal-header">
        <span>{{ t('模板库') }} <span class="sub">{{ headerHint }}</span></span>
        <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
      </div>

      <div class="tpl-body">
        <div class="tpl-list">
          <div class="group-title">{{ t('内置模板') }}</div>
          <div
            v-for="item in builtin"
            :key="item.id"
            class="tpl-item"
            :class="{ active: current && current.id === item.id }"
            @click="current = item"
          >
            <div class="tpl-thumb" :style="thumbStyle(item)" aria-hidden="true">
              <div
                v-for="c in thumbComps(item)"
                :key="c.id"
                class="tpl-thumb-comp"
                :class="'pv-' + c.type"
                :style="thumbBox(item, c)"
              ></div>
            </div>
            <span class="ellipsis">{{ item.name }}</span>
          </div>

          <div class="group-title">
            {{ t('我的模板') }}
            <span class="count">{{ tplStore.userTemplates.length }}</span>
          </div>
          <div v-if="!tplStore.userTemplates.length" class="empty-user">
            <div class="empty-hint">{{ t('还没有保存过模板') }}</div>
            <button class="btn btn-sm" @click="saveCurrent">{{ t('把当前设计另存为模板') }}</button>
          </div>
          <div
            v-for="item in tplStore.userTemplates"
            :key="item.id"
            class="tpl-item"
            :class="{ active: current && current.id === item.id }"
            @click="current = item"
          >
            <div class="tpl-thumb" :style="thumbStyle(item)" aria-hidden="true">
              <div
                v-for="c in thumbComps(item)"
                :key="c.id"
                class="tpl-thumb-comp"
                :class="'pv-' + c.type"
                :style="thumbBox(item, c)"
              ></div>
            </div>
            <span class="ellipsis">{{ item.name }}</span>
            <button class="del" :title="t('删除模板')" @click.stop="remove(item)">×</button>
          </div>
        </div>

        <div class="tpl-detail" v-if="current">
          <div class="tpl-head">
            <b>{{ current.name }}</b>
            <span class="dim">{{ current.desc }}</span>
          </div>

          <div class="preview-wrap">
            <div class="preview" :style="previewStyle">
              <div
                v-for="c in current.components"
                :key="c.id"
                class="pv-comp"
                :class="'pv-' + c.type"
                :style="compBox(c)"
                :title="c.type"
              >{{ glyph(c) }}</div>
            </div>
          </div>

          <div class="meta">
            <div>{{ t('标签') }}：<b>{{ current.label.width }} × {{ current.label.height }} mm</b></div>
            <div>{{ t('纸张') }}：{{ current.paper.width }} × {{ current.paper.height }} mm · {{ t('排版') }}：{{ layoutText(current) }}</div>
            <div>{{ t('组件') }}：{{ current.components.length }} {{ t('个') }}</div>
            <div v-if="tplFields.length">{{ t('引用字段') }}：<code>{{ tplFields.join('、') }}</code></div>
          </div>

          <label v-if="matchedSample" class="sample-opt">
            <input v-model="loadSampleAlong" type="checkbox" />
            <span>{{ t('同时灌入示例数据') }}（{{ t(matchedSample.name) }}）</span>
          </label>

          <div class="btns">
            <button class="btn btn-primary btn-apply" :disabled="applying" @click="apply(current)">
              {{ applying ? t('应用中…') : t('应用此模板') }}
            </button>
            <button class="btn" @click="saveCurrent">{{ t('把当前设计另存为模板') }}</button>
            <button v-if="current.custom" class="btn" @click="remove(current)">{{ t('删除模板') }}</button>
          </div>
        </div>

        <div class="tpl-detail empty" v-else>
          <div class="empty-hint">{{ t('请选择左侧的模板') }}</div>
          <button class="btn btn-sm" @click="saveCurrent">{{ t('把当前设计另存为模板') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../stores/project'
import { useTemplateStore } from '../stores/templates'
import { useDataStore } from '../stores/data'
import { useI18n } from '../utils/i18n'
import { toastSuccess, toastError } from '../utils/toast'
import { BUILTIN_TEMPLATES } from '../utils/templates'
import { extractTemplateFields, autoMatchFieldMap } from '../utils/render'
import { findSampleForTemplate, loadSampleDataset } from '../utils/samples'

const { t } = useI18n()
const emit = defineEmits(['close'])

const project = useProjectStore()
const data = useDataStore()
const tplStore = useTemplateStore()

const builtin = BUILTIN_TEMPLATES
const current = ref(BUILTIN_TEMPLATES[0])
const loadSampleAlong = ref(true)
const applying = ref(false)

const matchedSample = computed(() => findSampleForTemplate(current.value?.id))
const headerHint = computed(() =>
  matchedSample.value
    ? t('可同时灌入与模板字段对齐的示例数据')
    : t('应用模板只替换版式，保留数据源与字段映射')
)

watch(matchedSample, (s) => {
  loadSampleAlong.value = !!s
}, { immediate: true })

const tplFields = computed(() => {
  if (!current.value) return []
  const fromComps = extractTemplateFields(current.value.components)
  // 内置模板自带字段清单，合并展示
  const set = new Set([...(current.value.fields || []), ...fromComps])
  return Array.from(set)
})

// ============ 缩略示意图 ============
const PREVIEW_MAX_W = 300
const PREVIEW_MAX_H = 220
const THUMB_W = 44
const THUMB_H = 30

const previewScale = computed(() => {
  const c = current.value
  if (!c) return 1
  const s = Math.min(PREVIEW_MAX_W / c.label.width, PREVIEW_MAX_H / c.label.height)
  return Math.min(Math.max(s, 0.5), 6)
})

const previewStyle = computed(() => {
  const c = current.value
  return {
    width: Math.round(c.label.width * previewScale.value) + 'px',
    height: Math.round(c.label.height * previewScale.value) + 'px',
    background: c.label.backgroundColor || '#fff',
    border: c.label.showBorder ? `1px solid ${c.label.borderColor || '#000'}` : '1px solid #e2e8f0'
  }
})

function thumbScale(item) {
  if (!item?.label?.width) return 1
  return Math.min(THUMB_W / item.label.width, THUMB_H / item.label.height)
}
function thumbStyle(item) {
  const s = thumbScale(item)
  return {
    width: Math.max(28, Math.round((item.label?.width || 40) * s)) + 'px',
    height: Math.max(18, Math.round((item.label?.height || 30) * s)) + 'px',
    background: item.label?.backgroundColor || '#fff'
  }
}
function thumbComps(item) {
  return (item.components || []).slice(0, 8)
}
function thumbBox(item, c) {
  const s = thumbScale(item)
  return {
    left: (c.left * s) + 'px',
    top: (c.top * s) + 'px',
    width: Math.max(2, c.width * s) + 'px',
    height: Math.max(2, c.height * s) + 'px'
  }
}

function compBox(c) {
  const s = previewScale.value
  return {
    left: (c.left * s) + 'px',
    top: (c.top * s) + 'px',
    width: (c.width * s) + 'px',
    height: Math.max(4, (c.height * s)) + 'px',
    transform: c.angle ? `rotate(${c.angle}deg)` : 'none'
  }
}

const GLYPH = { text: 'T', table: '⊞', qrcode: '▣', barcode: '▌', image: '🖼', rect: '▭', line: '╱', date: '📅' }
function glyph(c) {
  if (c.type === 'text') return (c.text || '').slice(0, 6)
  return GLYPH[c.type] || c.type
}

function layoutText(tpl) {
  if (!tpl?.layout || tpl.layout.mode !== 'auto') return t('单张（每页 1 个）')
  if (tpl.layout.sizingMode === 'manual') return t('手动 {c} × {r}', { c: tpl.layout.cols, r: tpl.layout.rows })
  return t('按标签尺寸自动排满')
}

// ============ 动作 ============
async function apply(tpl) {
  if (applying.value) return
  applying.value = true
  try {
    project.applyTemplate(tpl)
    let withSample = false
    const sample = findSampleForTemplate(tpl.id)
    if (sample && loadSampleAlong.value) {
      if (data.rows.length > 0) {
        const ok = confirm(t('当前已有数据，是否替换为该模板的示例数据？'))
        if (ok) {
          await injectSample(sample.id)
          withSample = true
        }
      } else {
        await injectSample(sample.id)
        withSample = true
      }
    }
    // 模板字段与数据列同名时自动建立映射
    if (data.fields.length) {
      const used = tplFields.value
      project.updateFieldMap(autoMatchFieldMap(used, data.fields, project.project.dataSource.fieldMap || {}))
    }
    project.markDirty()
    toastSuccess(
      withSample
        ? t('已应用模板「{n}」，并灌入示例数据', { n: tpl.name })
        : t('已应用模板「{n}」', { n: tpl.name })
    )
    emit('close')
  } catch (e) {
    toastError(t('应用失败：{msg}', { msg: e.message || String(e) }))
  } finally {
    applying.value = false
  }
}

async function injectSample(sampleId) {
  const parsed = await loadSampleDataset(sampleId)
  data.setData({
    headers: parsed.headers,
    rows: parsed.rows,
    sourcePath: parsed.fileName,
    embedded: true
  })
  project.updateFieldMap({})
}

function saveCurrent() {
  const def = `${t('模板')} ${tplStore.userTemplates.length + 1}`
  const name = prompt(t('模板名称'), def)
  if (!name) return
  const tpl = tplStore.saveAsTemplate(project.getExportData(), name.trim())
  current.value = tpl
  toastSuccess(t('模板已保存'))
}

function remove(item) {
  if (!confirm(`${t('确定删除模板「{n}」吗？', { n: item.name })}`)) return
  tplStore.removeTemplate(item.id)
  if (current.value && current.value.id === item.id) {
    current.value = builtin[0] || tplStore.userTemplates[0] || null
  }
}
</script>

<style scoped>
.tpl-modal {
  width: 860px;
  max-width: 92vw;
  height: 620px;
  max-height: 88vh;
}
.sub {
  font-weight: normal;
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 8px;
}
.tpl-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.tpl-list {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  overflow: auto;
  padding: 8px;
}
.group-title {
  font-size: 11px;
  color: var(--text-muted);
  padding: 8px 6px 4px;
  display: flex;
  justify-content: space-between;
}
.count { color: var(--text-secondary); }
.tpl-item {
  padding: 7px 8px;
  border-radius: var(--radius);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tpl-item:hover { background: var(--bg-hover); }
.tpl-item.active {
  background: rgba(37, 99, 235, 0.14);
  color: var(--primary);
  font-weight: 600;
}
.tpl-thumb {
  position: relative;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.tpl-thumb-comp {
  position: absolute;
  background: rgba(37, 99, 235, 0.28);
  border-radius: 1px;
}
.tpl-thumb-comp.pv-qrcode,
.tpl-thumb-comp.pv-barcode { background: rgba(15, 23, 42, 0.35); }
.tpl-thumb-comp.pv-table { background: rgba(16, 185, 129, 0.4); }
.tpl-item .ellipsis {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-user {
  padding: 10px 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.btn-apply {
  min-width: 120px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.22);
}
.tpl-item .del {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  color: var(--text-muted);
}
.tpl-item .del:hover { background: var(--danger); color: white; }
.tpl-detail {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tpl-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tpl-head .dim {
  font-size: 12px;
  color: var(--text-secondary);
}
.preview-wrap {
  background: var(--bg);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
}
.preview {
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}
.pv-comp {
  position: absolute;
  overflow: hidden;
  font-size: 9px;
  line-height: 1.1;
  color: var(--text);
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.35);
  border-radius: 2px;
  padding: 1px 2px;
  white-space: nowrap;
}
.pv-qrcode, .pv-barcode { background: rgba(15, 23, 42, 0.08); border-color: #64748b; }
.pv-table { background: rgba(16, 185, 129, 0.1); border-color: var(--success); }
.pv-rect, .pv-line { background: rgba(148, 163, 184, 0.15); border-color: #94a3b8; }
.meta {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.meta code {
  background: var(--bg);
  padding: 1px 4px;
  border-radius: 3px;
}
.sample-opt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 22%, var(--border));
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  line-height: 1.4;
}
.sample-opt input {
  margin-top: 2px;
  flex-shrink: 0;
  accent-color: var(--primary);
}
.btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}
.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 6px;
}
.tpl-detail.empty {
  align-items: center;
  justify-content: center;
  gap: 12px;
}
</style>
