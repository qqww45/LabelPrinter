/**
 * 轻量占位符表达式：在 {{ }} 内扩展字段替换。
 * 预览 / PDF / 打印共用 render.js → expandTemplateText，不做 eval、不执行脚本。
 */
export function rowIsEmpty(row) {
  if (!row || typeof row !== 'object') return true
  return !Object.keys(row).some(k => k !== '__id' && !String(k).startsWith('__'))
}

function cellRaw(row, key) {
  if (!key || rowIsEmpty(row)) return undefined
  const k = String(key).trim()
  if (!k) return undefined
  if (row[k] !== undefined && row[k] !== null) return row[k]
  return undefined
}

function isEmptyVal(v) {
  return v == null || String(v).trim() === ''
}

export function formatPriceValue(v) {
  if (isEmptyVal(v)) return ''
  const n = Number(String(v).replace(/[,¥￥$\s]/g, ''))
  if (!Number.isFinite(n)) return String(v).trim()
  return n.toFixed(2)
}

export function formatNumValue(v, decimals = 0) {
  if (isEmptyVal(v)) return ''
  const n = Number(String(v).replace(/[,¥￥$\s]/g, ''))
  if (!Number.isFinite(n)) return String(v).trim()
  const d = Math.max(0, Math.min(8, Math.floor(Number(decimals) || 0)))
  return n.toFixed(d)
}

const FUNC = new Set(['if', 'ifempty', 'hide', 'price', 'num', 'join', 'concat'])

function splitPipeParts(rest, max = 3) {
  const parts = []
  let cur = ''
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]
    if (ch === '|' && parts.length < max - 1) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  parts.push(cur)
  return parts.map(s => s.trim())
}

function splitCommaList(s) {
  return String(s || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
}

/** 从单个 {{...}} 内层提取引用的字段名（不含函数名） */
export function fieldRefsFromPlaceholder(inner) {
  const s = String(inner || '').trim()
  if (!s) return []
  const lower = s.toLowerCase()
  for (const fn of FUNC) {
    if (lower.startsWith(fn + ' ') || lower.startsWith(fn + '\t')) {
      const rest = s.slice(fn.length).trim()
      if (fn === 'if') {
        const [field, a, b] = splitPipeParts(rest, 3)
        return [field, ...fieldRefsFromText(a), ...fieldRefsFromText(b)].filter(Boolean)
      }
      if (fn === 'ifempty' || fn === 'hide') {
        const [field, tail] = splitPipeParts(rest, 2)
        return [field, ...fieldRefsFromText(tail)].filter(Boolean)
      }
      if (fn === 'price' || fn === 'num') {
        const field = rest.split(/[|:]/)[0].trim()
        return field ? [field] : []
      }
      if (fn === 'join' || fn === 'concat') {
        return splitCommaList(rest)
      }
    }
  }
  const pipe = s.indexOf('|')
  if (pipe > 0) {
    const field = s.slice(0, pipe).trim()
    return field ? [field] : []
  }
  return [s]
}

/** 文本中所有 {{}} 引用的字段名 */
export function fieldRefsFromText(text) {
  const set = new Set()
  if (typeof text !== 'string' || !text.includes('{{')) return []
  let i = 0
  while (i < text.length) {
    const start = text.indexOf('{{', i)
    if (start === -1) break
    const end = findPlaceholderEnd(text, start)
    if (end === -1) break
    const inner = text.slice(start + 2, end - 2)
    for (const f of fieldRefsFromPlaceholder(inner)) {
      if (f) set.add(f)
    }
    i = end
  }
  return Array.from(set)
}

function evalInner(inner, row, depth) {
  const s = String(inner || '').trim()
  if (!s) return ''

  const pipe = s.indexOf('|')
  if (pipe > 0 && !FUNC.has(s.split(/\s+/)[0].toLowerCase())) {
    const field = s.slice(0, pipe).trim()
    const fmt = s.slice(pipe + 1).trim().toLowerCase()
    const v = cellRaw(row, field)
    if (fmt === 'price') return formatPriceValue(v)
    if (fmt === 'num' || fmt.startsWith('num:')) {
      const dec = fmt.includes(':') ? parseInt(fmt.split(':')[1], 10) : 0
      return formatNumValue(v, dec)
    }
  }

  const fnMatch = s.match(/^(ifempty|if|hide|price|num|join|concat)\s+([\s\S]+)$/i)
  if (!fnMatch) {
    const v = cellRaw(row, s)
    return v === undefined ? '' : String(v)
  }

  const fn = fnMatch[1].toLowerCase()
  const rest = fnMatch[2].trim()

  if (fn === 'price') {
    const field = rest.split(/[|:]/)[0].trim()
    return formatPriceValue(cellRaw(row, field))
  }
  if (fn === 'num') {
    const [fieldPart, decPart] = rest.split(':')
    const field = (fieldPart || '').trim()
    const dec = decPart != null ? parseInt(decPart, 10) : 0
    return formatNumValue(cellRaw(row, field), dec)
  }
  if (fn === 'join' || fn === 'concat') {
    const fields = splitCommaList(rest)
    const sep = fn === 'join' && fields.length > 1 ? ' ' : ''
    return fields
      .map(f => {
        const v = cellRaw(row, f)
        return v == null ? '' : String(v).trim()
      })
      .filter(x => x !== '')
      .join(sep)
  }
  if (fn === 'ifempty') {
    const [field, fallback] = splitPipeParts(rest, 2)
    const v = cellRaw(row, field)
    if (isEmptyVal(v)) return expandTemplateText(fallback || '', row, depth + 1)
    return v == null ? '' : String(v)
  }
  if (fn === 'hide') {
    const [field, content] = splitPipeParts(rest, 2)
    if (isEmptyVal(cellRaw(row, field))) return ''
    return expandTemplateText(content || '', row, depth + 1)
  }
  if (fn === 'if') {
    const [field, whenYes, whenNo] = splitPipeParts(rest, 3)
    const branch = isEmptyVal(cellRaw(row, field)) ? (whenNo || '') : (whenYes || '')
    return expandTemplateText(branch, row, depth + 1)
  }
  return ''
}

function findPlaceholderEnd(text, start) {
  if (!text.startsWith('{{', start)) return -1
  let i = start + 2
  let nest = 0
  while (i < text.length - 1) {
    if (text.startsWith('{{', i)) {
      nest += 1
      i += 2
      continue
    }
    if (text.startsWith('}}', i)) {
      if (nest === 0) return i + 2
      nest -= 1
      i += 2
      continue
    }
    i += 1
  }
  return -1
}

function replacePlaceholdersOnce(text, row, depth) {
  let out = ''
  let i = 0
  while (i < text.length) {
    const start = text.indexOf('{{', i)
    if (start === -1) {
      out += text.slice(i)
      break
    }
    out += text.slice(i, start)
    const end = findPlaceholderEnd(text, start)
    if (end === -1) {
      out += text.slice(start)
      break
    }
    const inner = text.slice(start + 2, end - 2)
    out += evalInner(inner, row, depth)
    i = end
  }
  return out
}

/**
 * 替换文本中所有 {{ }}（支持嵌套，多轮直到稳定）。
 * 无数据行时保留原文。
 */
export function expandTemplateText(text, row, depth = 0) {
  if (!text) return ''
  if (rowIsEmpty(row)) return text
  if (depth > 8) return String(text)
  let out = String(text)
  for (let pass = 0; pass < 6; pass++) {
    const next = replacePlaceholdersOnce(out, row, depth)
    if (next === out) break
    out = next
  }
  return out
}

/** 内层是否为「纯字段名」占位（设计态 ⚠ 用） */
export function isSimpleFieldPlaceholder(inner) {
  const s = String(inner || '').trim()
  if (!s || s.includes('|')) return false
  return !FUNC.has(s.split(/\s+/)[0].toLowerCase())
}
