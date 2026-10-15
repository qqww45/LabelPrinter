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

  const canvas = await html2canvas(el, {
    scale: 3,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false
  })
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
    const canvas = await html2canvas(els[i], {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    })
    const img = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(img, 'JPEG', 0, 0, width, height)
  }

  pdf.save(filename)
}

/**
 * 导出元素为图片
 */
export async function exportElementToImage(el, filename = 'label.png', scale = 3) {
  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false
  })
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  })
}
