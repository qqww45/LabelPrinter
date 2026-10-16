<template>
  <div class="project-sidebar" :class="{ embedded, collapsed: !embedded && !open }">
    <!-- 独立模式折叠态：窄条（LeftDock 嵌入时不使用） -->
    <div v-if="!embedded && !open" class="rail" @click="open = true" :title="t('展开项目列表')">
      <div class="rail-icon">🗂</div>
      <div class="rail-badge">{{ project.projects.length }}</div>
      <div class="rail-name">{{ currentName }}</div>
      <button class="rail-toggle" type="button" :title="t('展开项目列表')">›</button>
    </div>

    <!-- 内容面板 -->
    <div v-if="embedded || open" class="panel" :class="{ 'panel-embedded': embedded }">
      <div v-if="!embedded" class="panel-head">
        <span class="panel-title">🗂 {{ t('项目') }}</span>
        <span class="panel-count">{{ project.projects.length }}</span>
        <button class="icon-btn" type="button" @click="open = false" :title="t('收起面板')">‹</button>
      </div>

      <div class="actions">
        <button class="act" type="button" @click="$emit('new')" :title="t('新建项目')">📄 {{ t('新建') }}</button>
        <button class="act" type="button" @click="$emit('open')" :title="t('从文件打开项目')">📂 {{ t('打开') }}</button>
        <button class="act" type="button" @click="$emit('save')" :title="t('下载项目文件。设计会自动留在这台浏览器里')">💾 {{ t('下载') }}</button>
        <button class="act" type="button" @click="$emit('save-as')" :title="t('换个文件名下载')">📤 {{ t('下载为') }}</button>
      </div>

      <div class="list-label">{{ t('本地项目（自动保存）') }}</div>

      <div class="proj-list">
        <div
          v-for="p in project.projects"
          :key="p.id"
          class="proj-item"
          :class="{ current: p.id === project.currentId, editing: editingId === p.id }"
          @click="onItemClick(p)"
          :title="`${p.name}\n${t('最后修改')}：${fmtFull(p.updatedAt)}`"
        >
          <span class="dot" :class="{ on: p.id === project.currentId }"></span>

          <input
            v-if="editingId === p.id"
            ref="nameInput"
            class="name-input"
            v-model="editingName"
            @click.stop
            @keydown.enter.prevent="commitRename(p)"
            @keydown.esc.prevent="cancelRename"
            @blur="commitRename(p)"
          />

          <template v-else>
            <div class="proj-info">
              <div class="proj-name">{{ p.name }}</div>
              <div class="proj-meta">{{ labelOf(p) }} · {{ fmtTime(p.updatedAt) }}</div>
            </div>
            <button class="icon-btn pencil" type="button" @click.stop="startRename(p)" :title="t('重命名')">✎</button>
            <button class="icon-btn del" type="button" @click.stop="onRemove(p)" :title="t('删除项目')">✕</button>
          </template>
        </div>
      </div>

      <div class="panel-foot">
        <div class="foot-note">{{ t('自动保存在这台浏览器，下载才是文件') }}</div>
        <button
          type="button"
          class="clear-local"
          :disabled="clearing"
          :title="t('删除本浏览器里的项目、模板、打印记录与 AI Key')"
          @click="onClearLocal"
        >{{ clearing ? t('清除中…') : t('清除本机数据') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useProjectStore } from '../stores/project'
import { useI18n } from '../utils/i18n'
import { clearAllLocalData } from '../utils/localData'
import { toastError, toastSuccess } from '../utils/toast'

const { t } = useI18n()
defineProps({
  /** 嵌入 LeftDock 时只渲染内容，不自带收起窄条 */
  embedded: { type: Boolean, default: false }
})
const emit = defineEmits(['new', 'open', 'save', 'save-as', 'switch'])
const clearing = ref(false)

async function onClearLocal() {
  if (!confirm(t('确定清除本浏览器内的全部标签打印数据？\n包括项目、模板、打印记录、AI Key。此操作不可恢复。'))) return
  clearing.value = true
  try {
    await clearAllLocalData()
    toastSuccess(t('已清除，即将刷新'))
    setTimeout(() => location.reload(), 400)
  } catch (e) {
    toastError(e?.message || t('清除失败'))
    clearing.value = false
  }
}

const SIDEBAR_KEY = 'labelprint_sidebar_open'

const project = useProjectStore()
const open = ref(localStorage.getItem(SIDEBAR_KEY) !== '0')

watch(open, v => localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0'))

const editingId = ref(null)
const editingName = ref('')
const nameInput = ref(null)

const currentName = computed(() => project.project.meta?.name || t('未命名'))

function labelOf(p) {
  const lb = p.data?.label
  if (!lb) return '—'
  return `${lb.width}×${lb.height}mm`
}

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtFull(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function onItemClick(p) {
  if (editingId.value === p.id) return
  emit('switch', p.id)  // 走 App.vue 的安全切换（嵌入当前数据后再切）
}

// ============ 重命名（行内编辑） ============
async function startRename(p) {
  editingId.value = p.id
  editingName.value = p.name
  await nextTick()
  const el = Array.isArray(nameInput.value) ? nameInput.value[0] : nameInput.value
  el?.focus()
  el?.select()
}

function commitRename(p) {
  if (editingId.value !== p.id) return
  const name = editingName.value.trim()
  if (name && name !== p.name) project.renameProject(p.id, name)
  editingId.value = null
}

function cancelRename() {
  editingId.value = null
}

function onRemove(p) {
  if (editingId.value === p.id) editingId.value = null
  if (project.projects.length <= 1) {
    if (!confirm(t('这是最后一个项目，删除后将创建一个空白项目，确定吗？'))) return
  } else if (!confirm(t('删除项目「{n}」？此操作不可恢复。', { n: p.name }))) {
    return
  }
  project.deleteProject(p.id)
}
</script>

<style scoped>
.project-sidebar {
  flex-shrink: 0;
  height: 100%;
  border-right: 1px solid var(--border);
  background: var(--bg-panel);
  display: flex;
  transition: width 0.15s;
}
.project-sidebar.embedded {
  width: 100%;
  border-right: 0;
  transition: none;
}
.project-sidebar.collapsed { width: 40px; }

/* 折叠态窄条 */
.rail {
  width: 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  cursor: pointer;
  position: relative;
  user-select: none;
}
.rail:hover { background: var(--bg-hover); }
.rail-icon { font-size: 16px; }
.rail-badge {
  font-size: 10px;
  background: var(--primary);
  color: #fff;
  border-radius: 8px;
  padding: 0 5px;
  line-height: 14px;
}
.rail-name {
  writing-mode: vertical-rl;
  font-size: 11px;
  color: var(--text-secondary);
  max-height: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 1px;
}
.rail-toggle {
  position: absolute;
  bottom: 12px;
  font-size: 14px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
}

/* 展开态 */
.panel {
  width: 220px;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 8px;
}
.panel-embedded {
  width: 100%;
  min-height: 0;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
}
.panel-count {
  font-size: 10px;
  background: var(--bg);
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 0 6px;
  line-height: 15px;
  font-weight: 400;
}
.panel-head .icon-btn { margin-left: auto; }
.icon-btn {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 13px;
  padding: 2px 5px;
  border-radius: 4px;
  line-height: 1;
  flex-shrink: 0;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--text); }
.icon-btn.del:hover { background: #fee2e2; color: var(--danger); }

/* 项目操作条 */
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.act {
  padding: 6px 4px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--bg-panel);
  cursor: pointer;
  font-size: 11px;
  color: var(--text-secondary);
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}
.act:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--bg-hover);
}
.act:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

.list-label {
  font-size: 10px;
  color: var(--text-muted);
  padding: 2px 2px 0;
}

.proj-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.proj-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid transparent;
}
.proj-item:hover { background: var(--bg-hover); }
.proj-item.current {
  background: color-mix(in srgb, var(--primary) 12%, var(--bg-panel));
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
}
.proj-item.editing {
  background: var(--bg-soft, var(--bg));
  border-color: var(--primary);
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
}
.dot.on { background: var(--primary); }
.proj-info { flex: 1; min-width: 0; }
.proj-name {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.proj-item.current .proj-name { color: var(--primary); font-weight: 600; }
.proj-meta {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.proj-item .pencil,
.proj-item .del { opacity: 0; }
.proj-item:hover .pencil,
.proj-item:hover .del { opacity: 1; }

.name-input {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  padding: 3px 6px;
  border: 1px solid var(--primary);
  border-radius: 4px;
  outline: none;
  background: var(--bg-panel);
  color: var(--text);
}

.new-btn {
  width: 100%;
  padding: 8px;
  border: 1px dashed var(--border);
  border-radius: 5px;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
}
.new-btn:hover { border-color: var(--primary); color: var(--primary); background: #f8fafc; }
.panel-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  padding-top: 4px;
}
.foot-note {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.4;
}
.clear-local {
  font-size: 11px;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: var(--danger);
  background: rgba(239, 68, 68, 0.06);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}
.clear-local:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
  border-color: var(--danger);
}
.clear-local:disabled { opacity: 0.5; cursor: wait; }
.clear-local:focus-visible {
  outline: 2px solid var(--danger);
  outline-offset: 2px;
}
</style>
