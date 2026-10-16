<template>
  <div class="field-panel" :class="layout">
    <div class="panel-lead">
      <span>{{ t('拖到画布组件上绑定') }}</span>
      <button class="lead-add" type="button" :aria-label="t('添加字段')" :title="t('添加新字段')" @click="addFieldPrompt">+</button>
    </div>

    <div v-if="!data.fields.length" class="empty">
      <div>{{ t('暂无字段') }}</div>
      <div class="empty-sub">{{ t('下一步：先在底部导入数据') }}</div>
      <button class="empty-btn" type="button" @click="addFieldPrompt">+ {{ t('添加字段') }}</button>
    </div>

    <div v-else class="field-list" role="list">
      <div
        v-for="f in data.fields"
        :key="f"
        class="field-item"
        role="listitem"
        :draggable="editingField !== f"
        @dragstart="editingField !== f && onFieldDragStart($event, f)"
        :title="t('拖拽到组件绑定字段 {f}', { f })"
      >
        <input
          v-if="editingField === f"
          ref="fieldInput"
          class="field-input"
          :value="editDraft"
          @input="editDraft = $event.target.value"
          @blur="commitFieldRename(f)"
          @keydown.enter.prevent="commitFieldRename(f)"
          @keydown.esc="cancelFieldEdit"
          @click.stop
        />
        <template v-else>
          <span class="field-grip" aria-hidden="true">⠿</span>
          <span class="field-name" @click="startFieldEdit(f)">{{ f }}</span>
          <button
            class="field-x"
            type="button"
            :aria-label="t('删除该字段（会从所有组件解绑）')"
            :title="t('删除该字段（会从所有组件解绑）')"
            @click.stop="delField(f)"
          >×</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useDataStore } from '../stores/data'
import { useI18n } from '../utils/i18n'
import { toastError } from '../utils/toast'

defineProps({
  layout: { type: String, default: 'panel' } // panel | strip（strip 已弃用，保留兼容）
})

const data = useDataStore()
const { t } = useI18n()

const editingField = ref('')
const editDraft = ref('')
const fieldInput = ref(null)

function onFieldDragStart(e, field) {
  e.dataTransfer.setData('field-name', field)
  e.dataTransfer.effectAllowed = 'copy'
}

function startFieldEdit(name) {
  editingField.value = name
  editDraft.value = name
  nextTick(() => {
    const el = Array.isArray(fieldInput.value) ? fieldInput.value[0] : fieldInput.value
    if (el?.focus) {
      el.focus()
      try { el.setSelectionRange(0, name.length) } catch {}
    }
  })
}

function commitFieldRename(oldName) {
  if (!editingField.value) return
  const v = editDraft.value.trim()
  if (v && v !== oldName) {
    try { data.renameColumn(oldName, v) }
    catch (e) { toastError(e.message || t('重命名失败')) }
  }
  editingField.value = ''
  editDraft.value = ''
}

function cancelFieldEdit() {
  editingField.value = ''
  editDraft.value = ''
}

function addFieldPrompt() {
  const name = prompt(t('请输入新字段名（留空自动命名）'))
  if (name === null) return
  try { data.addColumn(name || '') }
  catch (e) { toastError(e.message || t('添加失败')) }
}

function delField(name) {
  if (!confirm(t('删除字段 "{name}" 及其所有数据？\n（所有组件的该字段绑定也会被清除）', { name }))) return
  try {
    data.removeColumn(name)
    if (editingField.value === name) cancelFieldEdit()
  } catch (e) {
    toastError(e.message || t('删除失败'))
  }
}
</script>

<style scoped>
.field-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  gap: 8px;
}
.panel-lead {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
.lead-add {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  border-radius: 5px;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
}
.lead-add:hover {
  border-color: var(--primary);
  color: var(--primary);
  border-style: solid;
}
.lead-add:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
.empty-sub { font-size: 11px; opacity: 0.85; }
.empty-btn {
  margin-top: 6px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-secondary);
  padding: 5px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 12px;
}
.empty-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  border-style: solid;
}
.field-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  cursor: grab;
  font-size: 12px;
  user-select: none;
}
.field-item:hover {
  border-color: var(--primary);
  background: var(--bg-panel);
}
.field-item:active { cursor: grabbing; }
.field-grip {
  color: var(--text-muted);
  font-size: 11px;
  flex-shrink: 0;
}
.field-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}
.field-x {
  width: 18px;
  height: 18px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
}
.field-item:hover .field-x { opacity: 0.85; }
.field-x:hover {
  background: var(--danger);
  color: #fff;
  opacity: 1;
}
.field-input {
  flex: 1;
  border: 1px solid var(--primary);
  outline: none;
  padding: 2px 6px;
  background: var(--bg-panel);
  color: inherit;
  border-radius: 4px;
  font-size: 12px;
  min-width: 0;
}
</style>
