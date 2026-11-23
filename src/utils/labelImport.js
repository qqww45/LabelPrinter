/**
 * 浏览器端：上传标签图 / PDF → 可编辑起步版式（默认本机处理，不上传服务器）。
 */
import {
  groupOcrLines,
  layoutLinesToComponents,
  mergeImportLayout,
  pdfTextItemsToOcrLines,
  resetLabelImportIds
} from './labelImportCore.js'

export const LABEL_IMPORT_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf'

export function isLabelImportFile(file) {
  if (!file) return false
  const t = String(file.type || '').toLowerCase()
  if (t.startsWith('image/') && !t.includes('svg')) return true
  if (t === 'application/pdf') return true
  const n = String(file.name || '').toLowerCase()
  return /\.(png|jpe?g|webp|pdf)$/.test(n)
}

/** 画布像素 → mm 的粗估（仅排版用） */
export function estimateLabelMmFromImage(widthPx, heightPx) {
  const w = Math.max(1, widthPx)
  const h = Math.max(1, heightPx)
  const ratio = w / h
  let lw = 60
  let lh = 40
  if (ratio > 1.8) {
    lw = 100
    lh = Math.round(100 / ratio)
  } else if (ratio < 0.55) {
    lh = 80
    lw = Math.round(80 * ratio)
  } else {
    lw = 70
    lh = Math.round(70 / ratio)
  }
  lw = Math.max(30, Math.min(150, lw))
  lh = Math.max(20, Math.min(150, lh))
  return { width: lw, height: lh, scalePxPerMm: w / lw }
}

async function loadImageFromFile(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('图片无法打开'))
      el.src = url
    })
    return { img, url, width: img.naturalWidth, height: img.naturalHeight }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/**
 * 简易图像对比度块 → 文本行启发式（无 OCR 引擎时的兜底）
 */
function heuristicLinesFromImageData(data, width, height) {
  const items = []
  const rowStep = Math.max(8, Math.floor(height / 24))
  let y = Math.floor(height * 0.08)
  while (y < height * 0.92) {
    let dark = 0
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      if (lum < 128) dark++
    }
    if (dark > width * 0.08) {
      items.push({
        text: `文本行 ${items.length + 1}`,
        x: width * 0.08,
        y,
        w: width * 0.84,
        h: rowStep,
        fontSize: Math.max(10, rowStep * 0.55)
      })
    }
    y += rowStep
  }
  return items
}

async function ocrImageWithTesseract(canvas) {
  if (canvas.width < 48 || canvas.height < 48) return null
  try {
    const { createWorker } = await import('tesseract.js')
    // 首跑可能从 CDN 拉取 traineddata（非用户图片）；离线失败时走 heuristic 兜底（见导入弹窗说明）。
    const worker = await createWorker('chi_sim+eng', 1, { logger: () => {} })
    const { data } = await worker.recognize(canvas)
    await worker.terminate()
    const lines = []
    for (const line of data.lines || []) {
      const b = line.bbox
      if (!b || !line.text?.trim()) continue
      lines.push({
        text: line.text.trim(),
        x: b.x0,
        y: b.y0,
        w: b.x1 - b.x0,
        h: b.y1 - b.y0,
        fontSize: Math.max(10, (b.y1 - b.y0) * 0.75)
      })
    }
    return lines
  } catch (e) {
    console.warn('OCR 跳过:', e?.message || e)
    return null
  }
}

async function imageFileToLayout(file, labelMmOverride) {
  const { img, url, width, height } = await loadImageFromFile(file)
  const labelMm = labelMmOverride || estimateLabelMmFromImage(width, height)
  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const cw = Math.round(width * scale)
  const ch = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, cw, ch)
  ctx.drawImage(img, 0, 0, cw, ch)
  URL.revokeObjectURL(url)

  let rawLines = await ocrImageWithTesseract(canvas)
  if (!rawLines?.length) {
    const imgData = ctx.getImageData(0, 0, cw, ch)
    rawLines = heuristicLinesFromImageData(imgData.data, cw, ch)
  }

  resetLabelImportIds()
  const grouped = groupOcrLines(rawLines)
  const baseLayout = layoutLinesToComponents(grouped, labelMm, { scalePxPerMm: cw / labelMm.width })
  const bg = canvas.toDataURL('image/png')
  const bgComp = {
    id: 'imp_bg',
    type: 'image',
    name: '参考底图',
    left: 0,
    top: 0,
    width: labelMm.width,
    height: labelMm.height,
    angle: 0,
    src: bg,
    source: 'static',
    binding: '',
    opacity: 0.35
  }
  const layout = mergeImportLayout(baseLayout, bgComp)
  return {
    layout,
    warnings: [
      '识别结果为起步版式，请对照原稿微调文字与位置。',
      '图片 OCR 首次使用可能在浏览器内下载中英文语言包（不上传您的文件）；失败时将使用本地启发式布局。'
    ],
    stats: { lines: grouped.length, components: layout.components.length }
  }
}

async function pdfFileToLayout(file, labelMmOverride) {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
  }
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const page = await doc.getPage(1)
  const viewport = page.getViewport({ scale: 1.5 })
  const textContent = await page.getTextContent()
  const ocrLines = pdfTextItemsToOcrLines(textContent.items, viewport.height, 1.5)

  let labelMm = labelMmOverride
  if (!labelMm) {
    const wPt = viewport.width / 1.5
    const hPt = viewport.height / 1.5
    labelMm = estimateLabelMmFromImage(wPt * 2, hPt * 2)
  }

  resetLabelImportIds()
  const grouped = groupOcrLines(ocrLines)
  let layout = layoutLinesToComponents(grouped, labelMm, { scalePxPerMm: (viewport.width / 1.5) / labelMm.width })

  if (!grouped.length) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    const imgLayout = await imageFileToLayout(
      new File([await new Promise((r) => canvas.toBlob(r, 'image/png'))], 'page.png', { type: 'image/png' }),
      labelMm
    )
    return imgLayout
  }

  return {
    layout,
    warnings: ['PDF 文本已提取为可编辑组件；复杂扫描页可能仍需手动调整。'],
    stats: { lines: grouped.length, components: layout.components.length }
  }
}

/**
 * @returns {Promise<{ layout: object, warnings: string[], stats: object }>}
 */
export async function importLabelFile(file, options = {}) {
  if (!file || !isLabelImportFile(file)) {
    throw new Error('请选择 PNG / JPG / WebP 或 PDF')
  }
  const labelMm = options.labelMm
  const t = String(file.type || '').toLowerCase()
  if (t === 'application/pdf' || String(file.name || '').toLowerCase().endsWith('.pdf')) {
    return pdfFileToLayout(file, labelMm)
  }
  return imageFileToLayout(file, labelMm)
}