/**
 * 给 AI 看的附图：本机压缩成 JPEG data URL，再随 chat 发给用户配置的接口。
 * 不经过本产品的服务器。
 */

export const VISION_MAX_FILE_BYTES = 8 * 1024 * 1024
export const VISION_MAX_EDGE = 1280
export const VISION_JPEG_QUALITY = 0.72

const ACCEPT = /^(image\/jpeg|image\/png|image\/webp|image\/gif)$/i

export function isVisionImageFile(file) {
  if (!file || typeof file !== 'object') return false
  if (file.type && ACCEPT.test(file.type)) return true
  const name = String(file.name || '').toLowerCase()
  return /\.(jpe?g|png|webp|gif)$/.test(name)
}

/** 纯函数：算压缩后画布尺寸 */
export function visionCanvasSize(width, height, maxEdge = VISION_MAX_EDGE) {
  const w = Math.max(1, Number(width) || 1)
  const h = Math.max(1, Number(height) || 1)
  const edge = Math.max(64, Number(maxEdge) || VISION_MAX_EDGE)
  const scale = Math.min(1, edge / Math.max(w, h))
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale
  }
}

/**
 * 浏览器里把 File/Blob 压成 data:image/jpeg;base64,...
 * Node 单测不调用本函数。
 */
export function fileToVisionDataUrl(file, opts = {}) {
  const maxEdge = opts.maxEdge ?? VISION_MAX_EDGE
  const quality = opts.quality ?? VISION_JPEG_QUALITY
  const maxBytes = opts.maxBytes ?? VISION_MAX_FILE_BYTES

  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('没有选择图片'))
      return
    }
    if (!isVisionImageFile(file)) {
      reject(new Error('请使用 JPG / PNG / WebP 图片'))
      return
    }
    if (file.size > maxBytes) {
      reject(new Error('图片太大，请换一张小于 8MB 的'))
      return
    }
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      reject(new Error('当前环境无法压缩图片'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片无法打开'))
      img.onload = () => {
        try {
          const { width, height } = visionCanvasSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge)
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法压缩图片'))
            return
          }
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
          const url = canvas.toDataURL('image/jpeg', quality)
          if (!url || url.length < 32) {
            reject(new Error('压缩失败'))
            return
          }
          // 约 4/3 膨胀；超过 ~2.5MB 字符就劝换图
          if (url.length > 2.5 * 1024 * 1024) {
            reject(new Error('压缩后仍太大，请换一张更近、更清晰的特写'))
            return
          }
          resolve(url)
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      }
      img.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  })
}

/** 拼到用户指令后面，提醒模型看图改校准 */
export function visionCalibrateHint(label = {}) {
  const w = label.width ?? '?'
  const h = label.height ?? '?'
  return [
    '附图是刚打出的标签照片（可能含纸张边缘）。',
    `当前设计标签约 ${w}×${h} mm。`,
    '请对比内容相对纸边的位置与大小，优先用 print.offsetXMm / offsetYMm / scalePercent 纠偏；正数向右/下，缩放 100 为原尺寸。',
    '不要为了整张偏移去改每个组件的 left/top。若看不清边缘，在 summary 里说明并给出保守微调。'
  ].join('')
}
