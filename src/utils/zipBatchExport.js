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