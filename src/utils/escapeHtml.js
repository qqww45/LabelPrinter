/**
 * HTML 转义：预览/打印用 innerHTML 前必须先过这里，
 * 防止导入的 Excel/项目 JSON 里塞脚本读走 API Key。
 */
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 转义后保留换行，供预览 HTML 渲染 */
export function escapeHtmlWithBreaks(s) {
  return escapeHtml(s).replace(/\n/g, '<br/>')
}

/**
 * 图片 src 白名单：允许 data:image / blob / http(s)。
 * 拦截 javascript: 与非图片 data:，降低 XSS / 钓鱼面。
 */
export function safeImageSrc(src) {
  const s = String(src || '').trim()
  if (!s) return ''
  const lower = s.slice(0, 32).toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return ''
  if (lower.startsWith('data:') && !lower.startsWith('data:image/')) return ''
  return s
}
