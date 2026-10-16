/**
 * 轻量 toast：替代 alert 做成功/失败/提示反馈。
 * 破坏性确认仍用 window.confirm。
 */
import { reactive } from 'vue'

const state = reactive({ items: [] })
let seq = 0

export function toast(message, type = 'info', duration = 3200) {
  const text = String(message ?? '').trim()
  if (!text) return null
  const id = ++seq
  state.items.push({ id, message: text, type })
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration)
  }
  return id
}

export function toastSuccess(message, duration) {
  return toast(message, 'success', duration)
}

export function toastError(message, duration = 4200) {
  return toast(message, 'error', duration)
}

export function toastInfo(message, duration) {
  return toast(message, 'info', duration)
}

export function dismissToast(id) {
  const i = state.items.findIndex((t) => t.id === id)
  if (i >= 0) state.items.splice(i, 1)
}

export function useToastState() {
  return state
}
