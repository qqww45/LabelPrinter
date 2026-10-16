/**
 * 读取文件为文本，自动检测编码（UTF-8 / GBK / GB18030）
 * 优先用 UTF-8，失败后用 GB18030（向下兼容 GBK/GB2312）
 * xlsx 库按需动态加载，避免拖慢首屏。
 */
export async function readFileAsText(file) {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)

  // 1. 检测 BOM
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes.slice(3))
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes.slice(2))
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes.slice(2))
  }

  // 2. 尝试 UTF-8（fatal 模式遇非法序列抛错）
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (!text.includes('\uFFFD')) return text
  } catch (_) { /* 非 UTF-8 */ }

  // 3. 回退 GB18030（兼容 GBK）
  try {
    return new TextDecoder('gb18030').decode(bytes)
  } catch (_) { /* 浏览器不支持 */ }

  // 4. 兜底 UTF-8 非 fatal
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * 解析 Excel/CSV 文件
 * @param {File} file
 * @returns {Promise<{headers: string[], rows: object[]}>}
 */
export async function parseExcelFile(file) {
  const name = (file.name || '').toLowerCase()
  // CSV/TXT 走文本路径（带编码检测）
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await readFileAsText(file)
    return parseCSVText(text)
  }

  const buf = await file.arrayBuffer()
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json(ws, { defval: '' })

  if (json.length === 0) {
    return { headers: [], rows: [] }
  }

  // 第一行的 key 作为字段名
  const headers = Object.keys(json[0])
  // 清理字段名（去 BOM、空白、特殊字符）
  const cleanHeaders = headers.map(h => normalizeFieldName(String(h)))

  const rows = json.map(row => {
    const obj = {}
    cleanHeaders.forEach((h, i) => {
      obj[h] = row[headers[i]] != null ? String(row[headers[i]]).trim() : ''
    })
    return obj
  })

  return { headers: cleanHeaders, rows }
}

/**
 * 解析 CSV 文本
 */
export function parseCSVText(text, delimiter = ',') {
  // 去除 UTF-8 BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line) => {
    const result = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue }
      if (c === '"') { inQuote = !inQuote; continue }
      if (c === delimiter && !inQuote) { result.push(cur); cur = ''; continue }
      cur += c
    }
    result.push(cur)
    return result
  }

  const rawHeaders = parseLine(lines[0]).map(h => h.trim())
  const headers = rawHeaders.map(h => normalizeFieldName(h))
  const rows = lines.slice(1).map(line => {
    const vals = parseLine(line)
    const obj = {}
    headers.forEach((h, i) => obj[h] = (vals[i] || '').trim())
    return obj
  })

  return { headers, rows }
}

/**
 * 规范化字段名：
 * - 去 BOM、空白
 * - 去重（同名字段加序号后缀）
 * - 过滤空名（替换为"未命名"）
 */
function normalizeFieldName(name) {
  if (!name) return '未命名'
  let clean = name.replace(/^\uFEFF/, '').trim()
  if (!clean) return '未命名'
  return clean
}

/**
 * 给定规范化后的字段名数组，对重复项加序号后缀
 */
export function dedupFieldNames(names) {
  const seen = new Map()
  return names.map(n => {
    if (!seen.has(n)) {
      seen.set(n, 1)
      return n
    }
    const i = seen.get(n)
    seen.set(n, i + 1)
    return `${n}_${i}`
  })
}

/**
 * 导出数据到 Excel（过滤内部字段 __id）
 */
export async function exportToExcel(headers, rows, filename = 'data.xlsx') {
  const XLSX = await import('xlsx')
  const cleanHeaders = (headers || []).filter(h => h !== '__id')
  const cleanRows = (rows || []).map(r => {
    const o = {}
    cleanHeaders.forEach(h => { o[h] = r[h] != null ? r[h] : '' })
    return o
  })
  const ws = XLSX.utils.json_to_sheet(cleanRows, { header: cleanHeaders })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
}

/**
 * 导出数据到 CSV（带 BOM 让 Excel 正确识别 UTF-8）
 */
export function exportToCSV(headers, rows, filename = 'data.csv') {
  const cleanHeaders = (headers || []).filter(h => h !== '__id')
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    // 包含逗号/引号/换行 → 用引号包裹，内部引号转义
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [cleanHeaders.map(esc).join(',')]
  ;(rows || []).forEach(r => {
    lines.push(cleanHeaders.map(h => esc(r[h])).join(','))
  })
  // UTF-8 BOM 让 Excel 正确识别中文
  const csv = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
