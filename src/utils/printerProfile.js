/**
 * 本机热敏打印机校准档案（localStorage，不经服务器）。
 * 与项目 printConfig 分离：换项目仍沿用同一台机的偏移/缩放。
 */
import { normalizeCalibrate } from './thermalCalibrate.js'

const KEY = 'labelprint_printer_profile_v1'

const DEFAULTS = normalizeCalibrate({})

export function getPrinterProfile() {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULTS }
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return normalizeCalibrate(JSON.parse(raw))
  } catch {
    return { ...DEFAULTS }
  }
}

/** 增量更新偏移 / 缩放 */
export function savePrinterProfile(patch = {}) {
  try {
    if (typeof localStorage === 'undefined') return getPrinterProfile()
    const next = normalizeCalibrate({ ...getPrinterProfile(), ...patch })
    localStorage.setItem(KEY, JSON.stringify(next))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labelprint-printer-profile'))
    }
    return next
  } catch (e) {
    console.warn('保存打印机校准失败:', e)
    return normalizeCalibrate({ ...DEFAULTS, ...patch })
  }
}

export { KEY as PRINTER_PROFILE_KEY }
