/**
 * AI 排版服务
 * - 调 OpenAI 兼容端点（DeepSeek / 智谱 / Qwen / OpenAI 等）
 * - 构造 system prompt：标签尺寸 + 组件类型 JSON schema
 * - 鲁棒解析 AI 返回（处理 ```json``` 包裹、夹杂说明文字）
 * - 校验/归一化每个组件，裁剪到画布范围内
 */

const FONT = 'Microsoft YaHei'

// 组件类型 JSON schema（给 AI 看的，字段含义标注）
export const COMPONENT_SCHEMA = `
[
  { "type": "text",    "name": "标题",   "left": 3, "top": 2,  "width": 54, "height": 7,  "text": "{{产品名称}}",   "fontSize": 11, "fontWeight": "bold",  "fill": "#000000", "textAlign": "left",   "binding": "产品名称" },
  { "type": "image",   "name": "图片",   "left": 3, "top": 15, "width": 20, "height": 20, "src": "",              "binding": "" },
  { "type": "table",   "name": "信息表", "left": 3, "top": 15, "width": 54, "height": 20, "rows": 2, "cols": 2, "fontSize": 8, "colWidths": [30, 70], "cells": { "0,0": {"text":"规格","binding":""}, "0,1":{"text":"{{规格}}","binding":"规格"}, "1,0":{"text":"单价","binding":""}, "1,1":{"text":"¥{{价格}}","binding":"价格"} } },
  { "type": "qrcode",  "name": "二维码", "left": 35,"top": 15, "width": 20, "height": 20, "text": "",             "binding": "网址" },
  { "type": "barcode", "name": "条形码", "left": 3, "top": 27, "width": 54, "height": 11, "text": "",             "binding": "条码", "format": "CODE128" },
  { "type": "rect",    "name": "矩形",   "left": 3, "top": 2,  "width": 54, "height": 0.3,"fill": "#000000" },
  { "type": "line",    "name": "分隔线", "left": 3, "top": 14, "width": 54, "height": 0,  "stroke": "#000000", "strokeWidth": 0.2 },
  { "type": "date",    "name": "日期",   "left": 3, "top": 28, "width": 30, "height": 5,  "format": "YYYY-MM-DD", "binding": "", "fontSize": 8 }
]
`

/**
 * 构造 system prompt
 * @param {{labelWidth:number,labelHeight:number,fields:string[],style:string}} opts
 */
export function buildSystemPrompt({ labelWidth, labelHeight, fields, style }) {
  const fieldList = fields.length ? fields.map(f => `  - ${f}`).join('\n') : '  （无 — 自由排版）'
  const styleHint = (style || '').trim() || '通用美观'
  return `你是一名专业的标签排版设计师。请根据用户给出的标签尺寸和字段列表，输出一份 JSON 数组描述该标签的所有组件。

# 标签画布
- 画布尺寸：${labelWidth} mm × ${labelHeight} mm（横向）
- 所有 left/top/width/height 单位 = mm
- 留白：四周至少留 1.5~2 mm 边距
- 字号建议：标题 12~18，字段名 8~10，字段值 9~12（小标签整体缩 1~2pt）
- 不要让任何组件超出画布 (left+width ≤ ${labelWidth}, top+height ≤ ${labelHeight})

# 可用字段（用户提供的全部数据列名）
${fieldList}

# 设计风格
${styleHint}

# 组件类型与 JSON 形状
${COMPONENT_SCHEMA}

# 绑定字段
- 如果组件显示的是某个数据字段，把 binding 设为该字段名（不带 {{}}）
- 静态文字（如单位、标签）则 binding 留空，text 直接写
- 二维码/条形码的 binding 指向要编码的字段（网址/条码号/编号等）

# 输出要求（严格）
- 只能输出 **一个合法 JSON 数组**，不要任何解释、注释、Markdown 围栏
- 数组里每个对象 = 一个组件（id 必须唯一，用 c_ai_<序号> 形式）
- 角标/分隔线等纯装饰可以加
- 必须使用上面 schema 中出现的 type 值，未列出字段可以省略（用默认值）
- 至少要为用户列出的每个字段生成至少一个组件（否则就是漏了）

直接输出 JSON 数组，不要前缀文字。`
}

/**
 * 调用 OpenAI 兼容端点
 * @param {{baseUrl:string,apiKey:string,model:string,temperature:number,maxTokens:number}} cfg
 * @param {Array<{role:string,content:string}>} messages
 * @returns {Promise<{content:string, usage?:object}>}
 */
export async function callChat(cfg, messages) {
  const url = (cfg.baseUrl || '').replace(/\/+$/, '') + '/chat/completions'
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: cfg.temperature ?? 0.4,
      max_tokens: cfg.maxTokens ?? 4096,
      stream: false
    })
  })
  if (!resp.ok) {
    let msg = resp.statusText
    try {
      const j = await resp.json()
      msg = j?.error?.message || j?.message || msg
    } catch (e) { /* ignore */ }
    throw new Error(`HTTP ${resp.status}: ${msg}`)
  }
  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage
  }
}

/**
 * 鲁棒解析 AI 返回
 * - 去除 ```json ... ``` / ``` ... ``` 围栏
 * - 找第一个 [ ... ]（括号配对）
 * - JSON.parse
 */
export function parseAIResponse(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('AI 返回为空')
  let s = raw.trim()

  // 1) 去围栏
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  // 2) 直接 parse
  try { return JSON.parse(s) } catch (e) { /* fall through */ }

  // 3) 找第一个 [ 到匹配的 ]
  const start = s.indexOf('[')
  if (start < 0) {
    // 也许是 { "components": [...] }
    const objStart = s.indexOf('{')
    if (objStart < 0) throw new Error('AI 返回中找不到 JSON')
    const objEnd = findMatchingClose(s, objStart)
    const obj = JSON.parse(s.slice(objStart, objEnd + 1))
    const arr = obj.components || obj.data || obj.items || obj.result
    if (!Array.isArray(arr)) throw new Error('AI JSON 顶层不是数组')
    return arr
  }
  const end = findMatchingClose(s, start)
  return JSON.parse(s.slice(start, end + 1))
}

function findMatchingClose(s, start) {
  const pairs = { '{': '}', '[': ']' }
  const open = s[start]
  if (!pairs[open]) throw new Error('JSON 括号不匹配')
  const stack = [pairs[open]]
  let inStr = false
  let escape = false
  for (let i = start + 1; i < s.length; i++) {
    const ch = s[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') stack.push(pairs[ch])
    else if (ch === '}' || ch === ']') {
      if (ch !== stack[stack.length - 1]) throw new Error('JSON 括号不匹配')
      stack.pop()
      if (stack.length === 0) return i
    }
  }
  throw new Error('JSON 括号不匹配')
}

// 合法组件类型
const VALID_TYPES = new Set(['text', 'image', 'table', 'qrcode', 'barcode', 'rect', 'line', 'date'])

/**
 * 校验 + 归一化 + 裁剪到画布
 * @param {Array} arr  AI 返回的数组
 * @param {{labelWidth:number,labelHeight:number,fields:string[]}} canvas
 * @returns {{components:Array, warnings:Array<string>}}
 */
export function validateAndNormalize(arr, { labelWidth, labelHeight, fields }) {
  const warnings = []
  if (!Array.isArray(arr)) throw new Error('AI 返回不是数组')
  if (arr.length === 0) throw new Error('AI 返回了空数组')

  const components = []
  const seenIds = new Set()
  const boundFields = new Set()
  const fieldSet = new Set(fields || [])

  arr.forEach((raw, i) => {
    try {
      const c = normalizeOne(raw, i, labelWidth, labelHeight, seenIds)
      if (!c) { warnings.push(`第 ${i + 1} 项：无 type 或类型不合法，已跳过`); return }
      if (c.binding && fieldSet.size && !fieldSet.has(c.binding)) {
        warnings.push(`${c.name || c.type} 绑定的「${c.binding}」不在字段列表中`)
      } else if (c.binding) {
        boundFields.add(c.binding)
      }
      components.push(c)
    } catch (e) {
      warnings.push(`第 ${i + 1} 项：${e.message || '格式错误'}，已跳过`)
    }
  })

  // 字段绑定完整性提示（不阻塞）
  if (fieldSet.size) {
    const unbinded = [...fieldSet].filter(f => !boundFields.has(f))
    if (unbinded.length) warnings.push('以下字段未在生成结果中找到绑定：' + unbinded.join('、'))
  }

  return { components, warnings }
}

function normalizeOne(raw, i, LW, LH, seenIds) {
  if (!raw || typeof raw !== 'object') return null
  const type = String(raw.type || '').toLowerCase()
  if (!VALID_TYPES.has(type)) return null

  // id 唯一
  let id = String(raw.id || '').trim()
  if (!id || seenIds.has(id)) id = `c_ai_${i + 1}_${Date.now().toString(36).slice(-4)}`
  seenIds.add(id)

  // 几何
  const left = num(raw.left, 0)
  const top = num(raw.top, 0)
  const width = Math.max(1, num(raw.width, 20))
  const height = Math.max(0.1, num(raw.height, 5))

  // 裁剪到画布
  const cl = clamp(left, 0, LW - 1)
  const ct = clamp(top, 0, LH - 1)
  const cw = Math.min(width, LW - cl)
  const ch = Math.min(height, LH - ct)

  const c = {
    id, type, name: String(raw.name || defaultName(type)),
    left: round2(cl), top: round2(ct),
    width: round2(cw), height: round2(ch),
    angle: 0
  }

  switch (type) {
    case 'text':
      c.text = String(raw.text || '')
      c.fontSize = num(raw.fontSize, 10)
      c.fontFamily = FONT
      c.fill = String(raw.fill || '#000000')
      c.fontWeight = ['normal', 'bold'].includes(raw.fontWeight) ? raw.fontWeight : 'normal'
      c.textAlign = ['left', 'center', 'right'].includes(raw.textAlign) ? raw.textAlign : 'left'
      if (raw.binding) c.binding = String(raw.binding)
      break
    case 'image':
      c.src = String(raw.src || '')
      if (raw.binding) c.binding = String(raw.binding)
      break
    case 'table': {
      const rows = Math.max(1, Math.floor(num(raw.rows, 2)))
      const cols = Math.max(1, Math.floor(num(raw.cols, 2)))
      c.rows = rows
      c.cols = cols
      c.fontSize = num(raw.fontSize, 8)
      c.fontFamily = FONT
      c.textAlign = ['left', 'center', 'right'].includes(raw.textAlign) ? raw.textAlign : 'left'
      c.cellPadding = num(raw.cellPadding, 1)
      c.borderColor = String(raw.borderColor || '#333')
      c.borderWidth = num(raw.borderWidth, 0.2)
      c.fill = String(raw.fill || '#ffffff')
      c.headerRow = raw.headerRow !== false
      c.headerBg = String(raw.headerBg || '#f1f5f9')
      c.colWidths = Array.isArray(raw.colWidths) && raw.colWidths.length === cols
        ? raw.colWidths.map(v => num(v, 100 / cols))
        : Array(cols).fill(100 / cols)
      c.cells = {}
      if (raw.cells && typeof raw.cells === 'object') {
        for (const k of Object.keys(raw.cells)) {
          const v = raw.cells[k]
          if (v == null) continue
          c.cells[k] = {
            text: String(v.text || ''),
            binding: v.binding ? String(v.binding) : ''
          }
        }
      }
      if (raw.binding) c.binding = String(raw.binding)
      break
    }
    case 'qrcode':
      c.text = String(raw.text || '')
      if (raw.binding) c.binding = String(raw.binding)
      break
    case 'barcode':
      c.text = String(raw.text || '')
      if (raw.binding) c.binding = String(raw.binding)
      c.format = String(raw.format || 'CODE128')
      break
    case 'rect':
      c.fill = String(raw.fill || '#000000')
      break
    case 'line':
      c.stroke = String(raw.stroke || '#000000')
      c.strokeWidth = num(raw.strokeWidth, 0.2)
      c.height = Math.max(c.height, 0.1)
      break
    case 'date':
      c.format = String(raw.format || 'YYYY-MM-DD')
      c.fontSize = num(raw.fontSize, 8)
      c.fontFamily = FONT
      c.fill = String(raw.fill || '#000000')
      if (raw.binding) c.binding = String(raw.binding)
      break
  }
  return c
}

function num(v, def) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}
function round2(n) { return Math.round(n * 100) / 100 }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)) }
function defaultName(type) {
  return ({ text: '文本', image: '图片', table: '表格', qrcode: '二维码', barcode: '条形码', rect: '矩形', line: '直线', date: '日期' })[type] || type
}
