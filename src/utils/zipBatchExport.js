/**
 * 客户端 ZIP 批量导出：多标签 PDF/PNG，无服务端。
 */
import JSZip from 'jszip'
import fileSaver from 'file-saver'
const { saveAs } = fileSaver

/**
 * @param {Array<{ name: string, data: Blob|Uint8Array|ArrayBuffer, mime?: string }>} entries
 */
export function buildZipBlob(entries) {
  const zip = new JSZip()
  const list = Array.isArray(entries) ? entries : []
  for (const e of list) {
    const name = String(e?.name || 'file.bin').replace(/[/\\]+/g, '_')
    if (!name) continue
    if (e.data instanceof Blob) zip.file(name, e.data)
    else if (e.data) zip.file(name, e.data)
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

export async function downloadZipArchive(entries, filename = 'labels.zip') {
  const blob = await buildZipBlob(entries)
  saveAs(blob, filename.endsWith('.zip') ? filename : `${filename}.zip`)
}

/**
 * 纯函数：为 N 张标签生成文件名序列
 */
export function labelBatchFilenames(baseName, count, ext) {
  const base = String(baseName || 'label').replace(/[/\\]+/g, '_') || 'label'
  const x = Math.max(1, Math.floor(Number(count) || 1))
  const suffix = String(ext || 'pdf').replace(/^\./, '')
  if (x === 1) return [`${base}.${suffix}`]
  return Array.from({ length: x }, (_, i) => `${base}-${String(i + 1).padStart(3, '0')}.${suffix}`)
}

function buffersEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * 校验 ZIP 条目：名称唯一，且各 per-label 文件内容彼此不同（不能与另一份逐字相同）。
 * @param {Array<{ name: string, data: Uint8Array|ArrayBuffer }>} perLabelEntries
 */
export function assertDistinctPerLabelZipEntries(perLabelEntries) {
  const list = Array.isArray(perLabelEntries) ? perLabelEntries : []
  const names = new Set()
  const bufs = []
  for (const e of list) {
    const name = String(e?.name || '')
    if (!name || names.has(name)) throw new Error(`duplicate or empty zip entry name: ${name}`)
    names.add(name)
    const raw = e.data instanceof Uint8Array ? e.data : new Uint8Array(e.data || [])
    if (!raw.length) throw new Error(`empty entry: ${name}`)
    for (const prev of bufs) {
      if (buffersEqual(prev, raw)) throw new Error(`per-label files must differ: ${name}`)
    }
    bufs.push(raw)
  }
  return true
}

/**
 * 构建 ZIP 条目：每张标签独立 PDF，另附整批合并 PDF（可选）。
 * @param {{ project: object, labels: object[], buildPdfBlob: (opts: { project, labels }) => Promise<Blob> }} opts
 */
export async function buildPerLabelZipEntries({ project, labels, buildPdfBlob }) {
  const list = Array.isArray(labels) ? labels : []
  if (!list.length) return []
  const base = String(project?.meta?.name || 'labels').replace(/[/\\]+/g, '_') || 'labels'
  const names = labelBatchFilenames(base, list.length, 'pdf')
  const entries = []
  for (let i = 0; i < list.length; i++) {
    const data = await buildPdfBlob({ project, labels: [list[i]] })
    entries.push({ name: names[i], data })
  }
  if (list.length > 1) {
    const batch = await buildPdfBlob({ project, labels: list })
    entries.push({ name: `${base}-batch.pdf`, data: batch })
  }
  return entries
}