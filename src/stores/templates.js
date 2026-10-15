import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { BUILTIN_TEMPLATES, snapshotAsTemplate } from '../utils/templates'

const STORAGE_KEY = 'labelprint_templates_v1'

export const useTemplateStore = defineStore('templates', () => {
  const userTemplates = ref([])

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) userTemplates.value = list
    }
  } catch (e) { /* 损坏则忽略 */ }

  const allTemplates = computed(() => [...BUILTIN_TEMPLATES, ...userTemplates.value])

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userTemplates.value))
    } catch (e) {
      console.warn('模板保存失败（可能超出存储配额）:', e)
    }
  }

  // 把当前项目设计另存为模板
  function saveAsTemplate(projectSnapshot, name) {
    const tpl = snapshotAsTemplate(projectSnapshot, name)
    userTemplates.value.unshift(tpl)
    persist()
    return tpl
  }

  function removeTemplate(id) {
    userTemplates.value = userTemplates.value.filter(t => t.id !== id)
    persist()
  }

  function renameTemplate(id, name) {
    const t = userTemplates.value.find(t => t.id === id)
    if (t) {
      t.name = name
      persist()
    }
  }

  return { userTemplates, allTemplates, saveAsTemplate, removeTemplate, renameTemplate }
})
