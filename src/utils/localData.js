/**
 * 本机数据清理：只动 labelprint_* 键与 IndexedDB，不动渲染/打印算法。
 */
import { idbClear } from './idb.js'

/** 已知会写入的 localStorage / sessionStorage 键（前缀兜底也会清） */
export const LOCAL_DATA_KEYS = [
  'labelprint_projects_v1',
  'labelprint_settings_v1',
  'labelprint_ai_v1',
  'labelprint_ai_key_session',
  'labelprint_templates_v1',
  'labelprint_print_history_v1',
  'labelprint_print_queue_v1',
  'labelprint_user_defaults_v1',
  'labelprint_printer_profile_v1',
  'labelprint_onboarding_dismissed',
  'labelprint_property_panel_width',
  'labelprint_property_panel_hidden',
  'labelprint_sidebar_open',
  'labelprint_data_colwidths_v1',
  'labelprint_style_clipboard_v1',
  'labelprint_data_v1' // 旧版遗留
]

function clearStorageByPrefix(storage, prefix) {
  if (!storage) return
  const doomed = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k && k.startsWith(prefix)) doomed.push(k)
  }
  for (const k of doomed) {
    try { storage.removeItem(k) } catch { /* ignore */ }
  }
}

/**
 * 清除本浏览器内本应用写入的全部数据，然后由调用方刷新页面。
 * @returns {{ keys: number, idb: boolean }}
 */
export async function clearAllLocalData() {
  let keys = 0
  for (const k of LOCAL_DATA_KEYS) {
    try {
      if (localStorage.getItem(k) != null) { localStorage.removeItem(k); keys++ }
    } catch { /* ignore */ }
    try {
      if (sessionStorage.getItem(k) != null) { sessionStorage.removeItem(k); keys++ }
    } catch { /* ignore */ }
  }
  // 兜底：清掉未来新增的 labelprint_* 键
  try { clearStorageByPrefix(localStorage, 'labelprint_') } catch { /* ignore */ }
  try { clearStorageByPrefix(sessionStorage, 'labelprint_') } catch { /* ignore */ }

  let idb = false
  try {
    await idbClear()
    idb = true
  } catch { /* ignore */ }

  return { keys, idb }
}
