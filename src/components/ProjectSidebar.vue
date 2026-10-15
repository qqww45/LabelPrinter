<template>
  <div class="project-sidebar" :class="{ collapsed: !open }">
    <!-- 折叠态：窄条 -->
    <div v-if="!open" class="rail" @click="open = true" :title="t('展开项目列表')">
      <div class="rail-icon">🗂</div>
      <div class="rail-badge">{{ project.projects.length }}</div>
      <div class="rail-name">{{ currentName }}</div>
      <button class="rail-toggle" :title="t('展开项目列表')">›</button>
    </div>

    <!-- 展开态：完整列表 -->
    <div v-else class="panel">
      <div class="panel-head">
        <span class="panel-title">🗂 {{ t('项目') }}</span>
        <span class="panel-count">{{ project.projects.length }}</span>
        <button class="icon-btn" @click="open = false" :title="t('收起面板')">‹</button>
      </div>

      <!-- 项目操作（新建 / 打开 / 保存 / 另存为） -->
      <div class="actions">
        <button class="act" @click="$emit('new')" :title="t('新建项目')">📄 {{ t('新建') }}</button>
        <button class="act" @click="$emit('open')" :title="t('从文件打开项目')">📂 {{ t('打开') }}</button>
        <button class="act" @click="$emit('save')" :title="t('保存为文件')">💾 {{ t('保存') }}</button>
        <button class="act" @click="$emit('save-as')" :title="t('另存为新文件')">📤 {{ t('另存') }}</button>
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

          <!-- 重命名输入框 -->
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
            <button class="icon-btn pencil" @click.stop="startRename(p)" :title="t('重命名')">✎</button>
            <button class="icon-btn del" @click.stop="onRemove(p)" :title="t('删除项目')">✕</button>
          </template>
        </div>
      </div>

      <button class="new-btn" @click="$emit('new')">＋ {{ t('新建项目') }}</button>
      <div class="panel-foot">{{ t('自动保存在浏览器本地') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useProjectStore } from '../stores/project'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const emit = defineEmits(['new', 'open', 'save', 'save-as', 'switch'])

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
  transition: all 0.15s;
}
.act:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: #f8fafc;
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
  background: #eff6ff;
  border-color: #bfdbfe;
}
.proj-item.editing { background: #f8fafc; border-color: var(--primary); }
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
  background: #fff;
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
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
}
</style>
