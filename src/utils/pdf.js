import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * 将毫米转换为 jsPDF 单位
 * jsPDF 默认单位是 mm，这里直接返回 mm 值
 */
function mmToPt(mm) {
  return mm * 2.83465
}

/**
 * html2canvas 会先把 <img> 按 CSS 尺寸栅格化，再按 scale 放大输出。
 * 小尺寸图片（如 101×11px 的标题图）会在这个阶段丢失细线条，导致导出和设计不一致。
 * 在克隆 DOM 里把图片放大 scale 倍、再等比缩回原位，让截图按足够分辨率采样原图。
 */
function captureOptions(scale) {
  const factor = Math.max(1, Number(scale) || 1)
  return {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    onclone: (doc, el) => {
      const root = el || doc
      root.querySelectorAll?.('img').forEach(img => {
        if (img.getAttribute('data-preview-hires') === '1') return
        const view = doc.defaultView || window
        const cs = view.getComputedStyle(img)
        const w = parseFloat(cs.width)
        const h = parseFloat(cs.height)
        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return
        img.style.width = `${w * factor}px`
        img.style.height = `${h * factor}px`
        img.style.transform = `scale(${1 / factor})`
        img.style.transformOrigin = 'top left'
      })
    }
  }
}

/**
 * 导出 HTML 元素为 PDF（单张）
 * @param {HTMLElement} el  要导出的 DOM 元素
 * @param {Object} paperCfg  { width, height, unit:'mm' }
 * @param {string} filename
 */
export async function exportElementToPDF(el, paperCfg, filename = 'label.pdf') {
  const { width, height } = paperCfg
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [width, height],
    compress: true
  })

  const canvas = await html2canvas(el, captureOptions(3))
  const img = canvas.toDataURL('image/jpeg', 0.95)

  pdf.addImage(img, 'JPEG', 0, 0, width, height)
  pdf.save(filename)
}

/**
 * 批量导出 HTML 元素数组为单个 PDF（多张）
 * @param {HTMLElement[]} els
 * @param {Object} paperCfg
 * @param {string} filename
 */
export async function exportElementsToPDF(els, paperCfg, filename = 'labels.pdf') {
  if (els.length === 0) return
  const { width, height } = paperCfg
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [width, height],
    compress: true
  })

  for (let i = 0; i < els.length; i++) {
    if (i > 0) pdf.addPage([width, height], width > height ? 'landscape' : 'portrait')
    const canvas = await html2canvas(els[i], captureOptions(3))
    const img = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(img, 'JPEG', 0, 0, width, height)
  }

  pdf.save(filename)
}

/**
 * 导出元素为图片
 */
export async function exportElementToImage(el, filename = 'label.png', scale = 3) {
  const canvas = await html2canvas(el, captureOptions(scale))
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('导出图片失败')), 'image/png')
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
