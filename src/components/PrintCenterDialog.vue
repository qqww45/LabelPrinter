<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal pc-modal">
      <div class="modal-header">
        <div class="tabs">
          <button class="tab" :class="{ active: tab === 'queue' }" @click="tab = 'queue'">
            🗂 {{ t('打印队列') }} <span class="badge">{{ printStore.queue.length }}</span>
          </button>
          <button class="tab" :class="{ active: tab === 'history' }" @click="tab = 'history'">
            🕘 {{ t('历史记录') }} <span class="badge">{{ printStore.history.length }}</span>
          </button>
        </div>
        <button class="btn btn-icon" type="button" :aria-label="t('关闭')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- 队列 -->
        <template v-if="tab === 'queue'">
          <div class="tip">{{ t('任务按顺序依次执行，每个任务会弹出一次系统打印对话框。在其他项目打开预览后可继续添加该项目的任务。') }}</div>
          <table v-if="printStore.queue.length" class="pc-table">
            <thead>
              <tr><th>{{ t('项目') }}</th><th>{{ t('内容') }}</th><th>{{ t('页数') }}</th><th>{{ t('份数') }}</th><th>{{ t('状态') }}</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="task in printStore.queue" :key="task.id">
                <td>{{ task.projectName }}</td>
                <td>{{ task.label }}</td>
                <td>{{ task.pages }}</td>
                <td>{{ task.copies }}</td>
                <td><span :class="'st-' + task.status">{{ statusText(task.status) }}</span></td>
                <td>
                  <button class="btn btn-sm" @click="printStore.removeTask(task.id)">{{ t('移除') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-hint">{{ t('队列为空。在打印预览中点「🗂 加入队列」添加任务。') }}</div>
        </template>

        <!-- 历史 -->
        <template v-else>
          <table v-if="printStore.history.length" class="pc-table">
            <thead>
              <tr><th>{{ t('时间') }}</th><th>{{ t('类型') }}</th><th>{{ t('项目') }}</th><th>{{ t('内容') }}</th><th>{{ t('页数') }}</th><th>{{ t('份数') }}</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="h in printStore.history" :key="h.id">
                <td class="nowrap">{{ fmtTime(h.at) }}</td>
                <td>{{ typeText(h.type) }}</td>
                <td>{{ h.projectName }}</td>
                <td>{{ h.detail }}</td>
                <td>{{ h.pages }}</td>
                <td>{{ h.copies }}</td>
                <td class="nowrap">
                  <button
                    class="btn btn-sm"
                    :disabled="!h.projectId || !hasProject(h.projectId)"
                    :title="hasProject(h.projectId) ? t('切换到该项目并打开预览') : t('该项目已不存在')"
                    @click="$emit('reprint', h)"
                  >{{ t('重打') }}</button>
                  <button class="btn btn-sm" @click="printStore.removeHistory(h.id)">{{ t('删除') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-hint">{{ t('暂无打印记录。打印 / 导出 PDF / 导出图片后会自动记录。') }}</div>
        </template>
      </div>

      <div class="modal-footer">
        <template v-if="tab === 'queue'">
          <button class="btn" :disabled="!printStore.queue.length" @click="printStore.clearQueue()">{{ t('清空队列') }}</button>
          <div class="spacer"></div>
          <button class="btn btn-primary" :disabled="!pendingCount" @click="startPrint">🖨️ {{ t('开始打印当前项目') }}</button>
        </template>
        <template v-else>
          <button class="btn" :disabled="!printStore.history.length" @click="printStore.clearHistory()">{{ t('清空历史') }}</button>
          <div class="spacer"></div>
          <button class="btn" @click="$emit('close')">{{ t('关闭') }}</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePrintStore } from '../stores/print'
import { useProjectStore } from '../stores/project'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const emit = defineEmits(['close', 'run-queue', 'reprint'])

const printStore = usePrintStore()
const project = useProjectStore()

const tab = ref('queue')

const pendingCount = computed(() =>
  printStore.queue.filter(t => t.status === 'pending' && t.projectId === project.currentId).length
)

const STATUS = { pending: '排队中', printing: '打印中', done: '已完成', failed: '失败' }
const TYPE = { print: '🖨️ 打印', pdf: '📄 PDF', image: '🖼️ 图片' }
function statusText(s) { return STATUS[s] ? t(STATUS[s]) : s }
function typeText(ty) { return TYPE[ty] ? t(TYPE[ty]) : ty }

function fmtTime(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function hasProject(id) {
  return project.projects.some(p => p.id === id)
}

function startPrint() {
  emit('run-queue')
}
</script>

<style scoped>
.pc-modal { width: 760px; max-width: 92vw; }
.tabs { display: flex; gap: 4px; }
.tab {
  padding: 6px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
.tab.active {
  background: #dbeafe;
  color: var(--primary);
}
.badge {
  font-weight: normal;
  font-size: 11px;
  color: var(--text-muted);
}
.tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.6;
}
.pc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.pc-table th, .pc-table td {
  border: 1px solid var(--border);
  padding: 6px 8px;
  text-align: left;
}
.pc-table th { background: var(--bg); font-weight: 600; }
.pc-table td:last-child { white-space: nowrap; }
.nowrap { white-space: nowrap; }
.st-pending { color: var(--warning); }
.st-printing { color: var(--primary); }
.st-done { color: var(--success); }
.st-failed { color: var(--danger); }
.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  padding: 24px 0;
  text-align: center;
}
.spacer { flex: 1; }
</style>
