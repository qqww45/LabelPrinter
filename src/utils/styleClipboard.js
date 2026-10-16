/**
 * 组件样式剪贴板（不含位置 / 大小 / 文本 / 绑定）
 * 跨组件共享 ref，刷新后 localStorage 恢复。
 */
import { ref } from 'vue'

export const STYLE_KEYS = [
  'fill', 'stroke', 'strokeWidth', 'opacity',
  'rx', 'ry',
  'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign',
  'lineHeight', 'letterSpacing', 'textDecoration', 'underline',
  'cellBgColor', 'cellTextColor', 'headerBg', 'headerText', 'gridColor', 'gridWidth'
]

const CLIP_KEY = 'labelprint_style_clipboard_v1'

/** @type {import('vue').Ref<null | { type: string, style: Record<string, unknown>, sourceName: string }>} */
export const styleClipboard = ref(null)

export function loadStyleClipboard() {
  try {
    const raw = localStorage.getItem(CLIP_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved && saved.type && saved.style && typeof saved.style === 'object') {
      styleClipboard.value = saved
    }
  } catch { /* ignore */ }
}

export function persistStyleClipboard() {
  try {
    if (styleClipboard.value) localStorage.setItem(CLIP_KEY, JSON.stringify(styleClipboard.value))
    else localStorage.removeItem(CLIP_KEY)
  } catch { /* ignore */ }
}

export function clearStyleClipboard() {
  styleClipboard.value = null
  persistStyleClipboard()
}

/** 从组件抽出样式对象；无可复制键时返回 null */
export function extractStyle(comp) {
  if (!comp) return null
  const style = {}
  for (const k of STYLE_KEYS) {
    if (k in comp) style[k] = comp[k]
  }
  return Object.keys(style).length ? style : null
}

/**
 * @param {object} comp
 * @param {string} sourceName
 * @returns {'ok' | 'empty'}
 */
export function copyStyleFrom(comp, sourceName) {
  const style = extractStyle(comp)
  if (!style) return 'empty'
  styleClipboard.value = {
    type: comp.type,
    style,
    sourceName: sourceName || comp.type
  }
  persistStyleClipboard()
  return 'ok'
}

export function canPasteStyleTo(comp) {
  return !!(comp && styleClipboard.value && styleClipboard.value.type === comp.type)
}

/** @returns {Record<string, unknown> | null} 可直接喂给 updateComponent */
export function stylePatchFor(comp) {
  if (!canPasteStyleTo(comp)) return null
  return { ...styleClipboard.value.style }
}

loadStyleClipboard()
