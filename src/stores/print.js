import { defineStore } from 'pinia'
import { ref } from 'vue'

const HIST_KEY = 'labelprint_print_history_v1'
const QUEUE_KEY = 'labelprint_print_queue_v1'

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (e) { return [] }
}

function save(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch (e) { /* 忽略 */ }
}

export const usePrintStore = defineStore('print', () => {
  // 打印队列：[{ id, projectId, projectName, label, range, rangeStart, rangeEnd, copies, pages, status, createdAt }]
  const queue = ref(load(QUEUE_KEY))
  // 打印历史：[{ id, type, projectId, projectName, detail, pages, copies, at }]
  const history = ref(load(HIST_KEY))

  const genId = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

  function persistQueue() { save(QUEUE_KEY, queue.value) }
  function persistHistory() { save(HIST_KEY, history.value.slice(0, 100)) }

  function addTask(task) {
    const t = {
      id: genId('q'),
      status: 'pending',
      createdAt: Date.now(),
      range: 'all',
      copies: 1,
      ...task
    }
    queue.value.push(t)
    persistQueue()
    return t
  }

  function updateTask(id, patch) {
    const t = queue.value.find(t => t.id === id)
    if (!t) return
    Object.assign(t, patch)
    persistQueue()
  }

  function removeTask(id) {
    queue.value = queue.value.filter(t => t.id !== id)
    persistQueue()
  }

  function clearQueue() {
    queue.value = []
    persistQueue()
  }

  function addHistory(entry) {
    history.value.unshift({
      id: genId('h'),
      at: Date.now(),
      ...entry
    })
    if (history.value.length > 100) history.value.length = 100
    persistHistory()
  }

  function removeHistory(id) {
    history.value = history.value.filter(h => h.id !== id)
    persistHistory()
  }

  function clearHistory() {
    history.value = []
    persistHistory()
  }

  return {
    queue, history,
    addTask, updateTask, removeTask, clearQueue,
    addHistory, removeHistory, clearHistory
  }
})
