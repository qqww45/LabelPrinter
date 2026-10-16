import { defineStore } from 'pinia'
import { ref } from 'vue'
import { detectPreferredLang, setI18nLang } from '../utils/i18n'

const KEY = 'labelprint_settings_v1'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('light')   // 'light' | 'dark'
  // 无本地偏好时跟系统/浏览器语言走；用户点过一次语言按钮后写入 localStorage
  const lang = ref(detectPreferredLang())

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (saved.theme === 'dark' || saved.theme === 'light') theme.value = saved.theme
    if (saved.lang === 'en' || saved.lang === 'zh') lang.value = saved.lang
  } catch (e) { /* 忽略 */ }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme: theme.value, lang: lang.value }))
    } catch (e) { /* 忽略 */ }
  }

  function applyTheme() {
    document.documentElement.dataset.theme = theme.value
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme()
    persist()
  }

  function toggleLang() {
    lang.value = lang.value === 'zh' ? 'en' : 'zh'
    setI18nLang(lang.value)
    persist()
  }

  // 启动即应用主题与语言
  applyTheme()
  setI18nLang(lang.value)

  return { theme, lang, toggleTheme, toggleLang }
})
