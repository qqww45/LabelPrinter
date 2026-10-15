<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal tpl-modal">
      <div class="modal-header">
        <span>📚 {{ t('模板库') }} <span class="sub">{{ t('应用模板只替换版式，保留数据源与字段映射') }}</span></span>
        <button class="btn btn-icon" @click="$emit('close')">×</button>
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
          >{{ item.name }}</div>

          <div class="group-title">
            {{ t('我的模板') }}
            <span class="count">{{ tplStore.userTemplates.length }}</span>
          </div>
          <div v-if="!tplStore.userTemplates.length" class="empty-hint">{{ t('还没有保存过模板') }}</div>
          <div
            v-for="item in tplStore.userTemplates"
            :key="item.id"
            class="tpl-item"
            :class="{ active: current && current.id === item.id }"
            @click="current = item"
          >
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

          <div class="btns">
            <button class="btn btn-primary" @click="apply(current)">{{ t('应用此模板') }}</button>
            <button class="btn" @click="saveCurrent">{{ t('把当前设计另存为模板') }}</button>
            <button v-if="current.custom" class="btn" @click="remove(current)">{{ t('删除模板') }}</button>
          </div>
        </div>

        <div class="tpl-detail empty" v-else>
          <div class="empty-hint">{{ t('请选择左侧的模板') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useTemplateStore } from '../stores/templates'
import { useDataStore } from '../stores/data'
import { useI18n } from '../utils/i18n'
import { BUILTIN_TEMPLATES } from '../utils/templates'
import { extractTemplateFields, autoMatchFieldMap } from '../utils/render'

const { t } = useI18n()
const emit = defineEmits(['close'])

const project = useProjectStore()
const data = useDataStore()
const tplStore = useTemplateStore()

const builtin = BUILTIN_TEMPLATES
const current = ref(BUILTIN_TEMPLATES[0])

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
function apply(tpl) {
  project.applyTemplate(tpl)
  // 模板字段与数据列同名时自动建立映射
  if (data.fields.length) {
    const used = tplFields.value
    project.updateFieldMap(autoMatchFieldMap(used, data.fields, project.project.dataSource.fieldMap))
  }
  emit('close')
}

function saveCurrent() {
  const def = `${t('模板')} ${tplStore.userTemplates.length + 1}`
  const name = prompt(t('模板名称'), def)
  if (!name) return
  const tpl = tplStore.saveAsTemplate(project.getExportData(), name.trim())
  current.value = tpl
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
  padding: 8px 10px;
  border-radius: var(--radius);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.tpl-item:hover { background: var(--bg-hover); }
.tpl-item.active {
  background: rgba(37, 99, 235, 0.14);
  color: var(--primary);
  font-weight: 600;
}
.tpl-item .ellipsis {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
}
</style>
