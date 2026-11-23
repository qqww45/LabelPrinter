/**
 * 将 SVG data URL 栅格化为 PNG，供 jsPDF addImage 与导出链路使用。
 */

export function isSvgDataUrl(src) {
  return /^data:image\/svg\+xml/i.test(String(src || '').trim())
}

/** jsPDF addImage 常见可嵌入的 data URL（PNG / JPEG） */
export function isPdfEmbeddableImageSrc(src) {
  const s = String(src || '').trim()
  if (!s) return false
  if (isSvgDataUrl(s)) return false
  return /^data:image\/(png|jpe?g)(;base64)?,/i.test(s)
    || /^https?:\/\//i.test(s)
}

/**
 * 浏览器：把 SVG（或其它位图 data URL）绘制到 canvas 并导出 PNG。
 * @param {string} dataUrl
 * @param {number} [maxPx=256]
 * @returns {Promise<string>} PNG data URL，失败返回 ''
 */
export function rasterizeDataUrlToPng(dataUrl, maxPx = 256) {
  const src = String(dataUrl || '').trim()
  if (!src || typeof document === 'undefined') return Promise.resolve('')
  if (isPdfEmbeddableImageSrc(src) && !isSvgDataUrl(src)) return Promise.resolve(src)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const nw = img.naturalWidth || maxPx
      const nh = img.naturalHeight || maxPx
      const scale = Math.min(1, maxPx / Math.max(nw, nh, 1))
      const w = Math.max(1, Math.round(nw * scale))
      const h = Math.max(1, Math.round(nh * scale))
      const cv = document.createElement('canvas')
      cv.width = w
      cv.height = h
      const ctx = cv.getContext('2d')
      if (!ctx) { resolve(''); return }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      try {
        resolve(cv.toDataURL('image/png'))
      } catch {
        resolve('')
      }
    }
    img.onerror = () => resolve('')
    img.src = src
  })
}

/** 导出 / PDF 前：SVG → PNG，可嵌入者原样返回 */
export async function imageSrcForPdfEmbed(src, maxPx = 320) {
  const s = String(src || '').trim()
  if (!s) return ''
  if (isPdfEmbeddableImageSrc(s)) return s
  if (isSvgDataUrl(s)) return rasterizeDataUrlToPng(s, maxPx)
  return s
}