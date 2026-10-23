/**
 * AI 排版服务
 * - 调 OpenAI 兼容端点（DeepSeek / 智谱 / Qwen / OpenAI 等）
 * - 构造 system prompt：标签尺寸 + 组件类型 JSON schema
 * - 鲁棒解析 AI 返回（处理 ```json``` 包裹、夹杂说明文字）
 * - 校验/归一化每个组件，裁剪到画布范围内
 */

import { normalizeCalibrate } from './thermalCalibrate.js'
import { getPrinterProfile } from './printerProfile.js'
import { clampGapMm } from './thermalMedia.js'
import {
  BUILTIN_SOURCE,
  BUILTIN_DEFAULT_ENDPOINT,
  normalizeBuiltinEndpoint
} from './aiModels.js'

const FONT = 'Microsoft YaHei'

// 组件类型 JSON schema（给 AI 看的，字段含义标注）
export const COMPONENT_SCHEMA = `
[
  { "type": "text",    "name": "标题",   "left": 3, "top": 2,  "width": 54, "height": 7,  "text": "{{产品名称}}",   "fontSize": 11, "fontWeight": "bold",  "fill": "#000000", "textAlign": "left",   "binding": "产品名称", "hideIfEmpty": false },
  { "type": "image",   "name": "图片",   "left": 3, "top": 15, "width": 20, "height": 20, "src": "",              "binding": "" },
  { "type": "table",   "name": "信息表", "left": 3, "top": 15, "width": 54, "height": 20, "rows": 2, "cols": 2, "fontSize": 8, "colWidths": [30, 70], "cells": { "0,0": {"text":"规格","binding":""}, "0,1":{"text":"{{规格}}","binding":"规格"}, "1,0":{"text":"单价","binding":""}, "1,1":{"text":"¥{{价格}}","binding":"价格"} } },
  { "type": "qrcode",  "name": "二维码", "left": 35,"top": 15, "width": 20, "height": 20, "text": "",             "binding": "网址" },
  { "type": "barcode", "name": "条形码", "left": 3, "top": 27, "width": 54, "height": 11, "text": "",             "binding": "条码", "format": "CODE128" },
  { "type": "rect",     "name": "矩形",   "left": 3, "top": 2,  "width": 54, "height": 0.3,"fill": "#000000" },
  { "type": "ellipse",  "name": "椭圆",   "left": 40,"top": 5,  "width": 16, "height": 12, "fill": "transparent", "stroke": "#000000", "strokeWidth": 0.3 },
  { "type": "line",     "name": "分隔线", "left": 3, "top": 14, "width": 54, "height": 0,  "stroke": "#000000", "strokeWidth": 0.2 },
  { "type": "date",     "name": "日期",   "left": 3, "top": 28, "width": 30, "height": 5,  "format": "YYYY-MM-DD", "binding": "", "fontSize": 8 },
  { "type": "serial",   "name": "序号",   "left": 40,"top": 28, "width": 18, "height": 5,  "source": "print", "prefix": "", "suffix": "", "pad": 4, "fontSize": 10, "fill": "#000000", "hideIfEmpty": true },
  { "type": "checkbox", "name": "勾选",   "left": 3, "top": 34, "width": 6,  "height": 6,  "binding": "已检", "checkedChar": "☑", "uncheckedChar": "☐", "fontSize": 12, "hideIfEmpty": false }
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
- 内容为空时不打印：文本/二维码/条码/日期/序号/勾选框可加 "hideIfEmpty": true
- 需要每张标签一个流水号：优先用 type "serial"（source 默认 print，可设 prefix/suffix/pad）；也可用文本写 {{序号}}。序号由打印设置生成，不要把它当成数据列
- 勾选框 type "checkbox"：binding 指向布尔/是否类字段；1/是/Y/true 显示勾选，0/否/空显示未勾选
- 椭圆 type "ellipse"：纯装饰，可设 fill/stroke/strokeWidth；无 binding

# 打印相关（只在用户要求时才做，生成版式本身不要输出打印设置）
- 整单份数、按某一列决定份数、起始序号、热敏纸间隙/黑标/连续纸，属于打印设置，不是组件

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

export const BUILTIN_UNREACHABLE =
  '内置 AI 不可用（本地预览没有这个端点，线上刚部署也请稍等）。可在 AI 设置里换成「自定义」，填自己的 API Key'

/**
 * 决定这一发请求走哪条路（纯函数，单测覆盖）
 * @param {{source?:string, builtinEndpoint?:string, baseUrl?:string, apiKey?:string, model?:string}} cfg
 * @returns {{kind:'builtin'|'custom', url:string, apiKey?:string, model?:string}}
 */
export function resolveChatTarget(cfg = {}) {
  if (cfg.source === BUILTIN_SOURCE) {
    return { kind: 'builtin', url: normalizeBuiltinEndpoint(cfg.builtinEndpoint) }
  }
  return {
    kind: 'custom',
    url: (String(cfg.baseUrl || '').replace(/\/+$/, '')) + '/chat/completions',
    apiKey: cfg.apiKey || '',
    model: cfg.model || ''
  }
}

let conversationIdCache = ''
/** 平台约定：AI 端点要收到 makers-conversation-id；本端点无状态，一次会话一个即可 */
function conversationId() {
  if (conversationIdCache) return conversationIdCache
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      conversationIdCache = crypto.randomUUID()
    }
  } catch (e) { /* 非安全上下文没有 crypto.randomUUID */ }
  if (!conversationIdCache) {
    conversationIdCache = 'lp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  }
  return conversationIdCache
}

/**
 * 调站点自带的内置端点（同源，不携带任何 Key）
 * @param {{builtinEndpoint?:string, temperature?:number, maxTokens?:number}} cfg
 */
export async function callBuiltin(cfg, messages) {
  const url = normalizeBuiltinEndpoint(cfg?.builtinEndpoint) || BUILTIN_DEFAULT_ENDPOINT
  let resp
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'makers-conversation-id': conversationId()
      },
      body: JSON.stringify({
        messages,
        temperature: Number.isFinite(cfg?.temperature) ? cfg.temperature : 0.4,
        maxTokens: Number.isFinite(cfg?.maxTokens) ? cfg.maxTokens : 4096
      })
    })
  } catch (e) {
    throw new Error(BUILTIN_UNREACHABLE)
  }
  // 站点把 /ai-chat 重写到 index.html 时会拿到 HTML；提前认出来，别让用户对着一堆标签发懵
  const ctype = String(resp.headers?.get?.('content-type') || '')
  const isJson = /json/i.test(ctype)
  if (!isJson) throw new Error(BUILTIN_UNREACHABLE)
  if (!resp.ok) {
    let msg = ''
    try {
      const j = await resp.json()
      msg = j?.error || j?.message || ''
    } catch (e) { /* 已确认是 JSON 类型，解析失败就当没消息 */ }
    if (!msg || resp.status === 404 || resp.status === 405) throw new Error(BUILTIN_UNREACHABLE)
    throw new Error(`HTTP ${resp.status}: ${msg}`)
  }
  let data = {}
  try {
    data = await resp.json()
  } catch (e) {
    throw new Error(BUILTIN_UNREACHABLE)
  }
  if (typeof data?.content !== 'string') throw new Error(BUILTIN_UNREACHABLE)
  return {
    content: data.content,
    usage: data.usage,
    model: data.model
  }
}

/**
 * 统一入口：按来源分发到内置端点或用户自定义的 OpenAI 兼容端点
 */
export async function callChatAuto(cfg, messages) {
  if (cfg?.source === BUILTIN_SOURCE) return callBuiltin(cfg, messages)
  return callChat(cfg, messages)
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
const VALID_TYPES = new Set(['text', 'image', 'table', 'qrcode', 'barcode', 'rect', 'ellipse', 'line', 'date', 'serial', 'checkbox'])

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
      if (typeof raw.hideIfEmpty === 'boolean') c.hideIfEmpty = raw.hideIfEmpty
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
      if (typeof raw.hideIfEmpty === 'boolean') c.hideIfEmpty = raw.hideIfEmpty
      break
    case 'barcode':
      c.text = String(raw.text || '')
      if (raw.binding) c.binding = String(raw.binding)
      c.format = String(raw.format || 'CODE128')
      if (typeof raw.hideIfEmpty === 'boolean') c.hideIfEmpty = raw.hideIfEmpty
      break
    case 'rect':
      c.fill = String(raw.fill || '#000000')
      break
    case 'ellipse':
      c.fill = String(raw.fill || 'transparent')
      c.stroke = String(raw.stroke || '#000000')
      c.strokeWidth = num(raw.strokeWidth, 0.3)
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
      if (typeof raw.hideIfEmpty === 'boolean') c.hideIfEmpty = raw.hideIfEmpty
      break
    case 'serial':
      c.source = raw.source === 'field' ? 'field' : 'print'
      c.prefix = String(raw.prefix || '')
      c.suffix = String(raw.suffix || '')
      c.pad = Math.max(0, Math.min(12, Math.floor(num(raw.pad, 0))))
      c.fontSize = num(raw.fontSize, 10)
      c.fontFamily = FONT
      c.fill = String(raw.fill || '#000000')
      c.fontWeight = ['normal', 'bold'].includes(raw.fontWeight) ? raw.fontWeight : 'bold'
      c.textAlign = ['left', 'center', 'right'].includes(raw.textAlign) ? raw.textAlign : 'left'
      if (raw.binding) c.binding = String(raw.binding)
      c.hideIfEmpty = typeof raw.hideIfEmpty === 'boolean' ? raw.hideIfEmpty : true
      break
    case 'checkbox':
      c.checkedChar = String(raw.checkedChar || '☑')
      c.uncheckedChar = String(raw.uncheckedChar || '☐')
      if (raw.checkedValue != null && String(raw.checkedValue) !== '') c.checkedValue = String(raw.checkedValue)
      c.fontSize = num(raw.fontSize, 12)
      c.fontFamily = FONT
      c.fill = String(raw.fill || '#000000')
      c.textAlign = ['left', 'center', 'right'].includes(raw.textAlign) ? raw.textAlign : 'center'
      if (raw.binding) c.binding = String(raw.binding)
      if (typeof raw.hideIfEmpty === 'boolean') c.hideIfEmpty = raw.hideIfEmpty
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
  return ({ text: '文本', image: '图片', table: '表格', qrcode: '二维码', barcode: '条形码', rect: '矩形', ellipse: '椭圆', line: '直线', date: '日期', serial: '序号', checkbox: '勾选框' })[type] || type
}

const ADJUST_ROW_CAP = 120

function clipCell(value) {
  const s = String(value ?? '')
  return s.length > 80 ? s.slice(0, 80) : s
}

const FONTS = new Set(['Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'Arial', 'sans-serif'])
const BARCODE_FORMATS = new Set(['CODE128', 'EAN13', 'CODE39'])
const CELL_TYPES = new Set(['text', 'qrcode', 'barcode', 'image'])

function packComponent(c) {
  const out = {
    id: c.id,
    type: c.type,
    name: c.name,
    left: c.left,
    top: c.top,
    width: c.width,
    height: c.height
  }
  const copy = ['text', 'binding', 'fontSize', 'fontFamily', 'fontWeight', 'fill', 'textAlign', 'format', 'stroke', 'strokeWidth', 'angle', 'source', 'rx', 'rows', 'cols', 'cellPadding', 'borderColor', 'borderWidth', 'headerBg', 'vAlign', 'prefix', 'suffix', 'pad', 'checkedChar', 'uncheckedChar', 'checkedValue']
  for (const key of copy) {
    if (c[key] != null && c[key] !== '') out[key] = c[key]
  }
  if (c.hideIfEmpty) out.hideIfEmpty = true
  if (c.hidden) out.hidden = true
  if (c.headerRow) out.headerRow = true
  if (c.type === 'image' && c.src) out.src = String(c.src).startsWith('data:') ? '(已有图片)' : String(c.src).slice(0, 120)
  if (c.type === 'table' && c.cells && typeof c.cells === 'object') {
    const cells = {}
    for (const [k, v] of Object.entries(c.cells).slice(0, 40)) {
      if (!v || typeof v !== 'object') continue
      cells[k] = { text: v.text || '', binding: v.binding || '', type: v.type || 'text' }
    }
    out.cells = cells
  }
  if (Array.isArray(c.colWidths) && c.colWidths.length) out.colWidths = c.colWidths
  return out
}

/**
 * 微调前必须打包的四块：布局、已有数据、打印设置、纸张排版。
 * 行数很多时附上每一列的空值个数和最长内容，避免模型只看表头。
 */
export function packAdjustContext({ project, rows, fields, selectedIds, calibrate }) {
  const p = project || {}
  const list = Array.isArray(rows) ? rows : []
  const cols = (fields && fields.length)
    ? fields.filter(h => h && h !== '__id')
    : Object.keys(list[0] || {}).filter(h => h !== '__id')
  const packedRows = list.slice(0, ADJUST_ROW_CAP).map((row, i) => {
    const out = { row: i + 1 }
    for (const name of cols) out[name] = clipCell(row?.[name])
    return out
  })
  const profile = cols.map(name => {
    let empty = 0
    let maxLen = 0
    for (const row of list) {
      const s = String(row?.[name] ?? '').trim()
      if (!s) empty += 1
      else if (s.length > maxLen) maxLen = s.length
    }
    return { name, empty, filled: list.length - empty, maxLen }
  })
  const label = p.label || {}
  const paper = p.paper || {}
  const margin = p.margin || {}
  const layout = p.layout || {}
  const printConfig = p.printConfig || {}
  const cal = normalizeCalibrate(calibrate != null ? calibrate : getPrinterProfile())
  return {
    label: {
      width: label.width,
      height: label.height,
      showBorder: !!label.showBorder,
      borderColor: label.borderColor || '#000000',
      borderWidth: label.borderWidth ?? 0.3,
      backgroundColor: label.backgroundColor || '#ffffff'
    },
    paper: { width: paper.width, height: paper.height },
    margin: { top: margin.top, right: margin.right, bottom: margin.bottom, left: margin.left },
    layout: {
      mode: layout.mode || 'single',
      sizingMode: layout.sizingMode || 'auto',
      cols: layout.cols || 1,
      rows: layout.rows || 1,
      hGap: layout.hGap || 0,
      vGap: layout.vGap || 0
    },
    print: {
      copies: printConfig.copies ?? 1,
      copiesColumn: printConfig.copiesColumn || '',
      serialEnabled: !!printConfig.serialEnabled,
      serialStart: printConfig.serialStart ?? 1,
      collate: !!printConfig.collate,
      range: printConfig.range || 'all',
      rangeStart: printConfig.rangeStart ?? 1,
      rangeEnd: printConfig.rangeEnd ?? 1,
      media: printConfig.media || 'gap',
      gapMm: printConfig.gapMm ?? 2,
      dpi: printConfig.dpi || 203,
      direction: printConfig.direction ?? 1,
      offsetXMm: cal.offsetXMm,
      offsetYMm: cal.offsetYMm,
      scalePercent: cal.scalePercent
    },
    components: (p.components || []).map(packComponent),
    selectedIds: (selectedIds || []).filter(id => (p.components || []).some(c => c.id === id)),
    fieldMap: { ...(p.dataSource?.fieldMap || {}) },
    fields: cols,
    rowCount: list.length,
    omittedRows: Math.max(0, list.length - packedRows.length),
    profile,
    rows: packedRows
  }
}

/**
 * 调整模式：必须带上布局、已有数据、打印设置和排版，再让模型只返回要改的部分。
 */
export function buildAdjustPrompt(input) {
  const ctx = input?.rows && input?.print && input?.layout
    ? input
    : packAdjustContext(input)
  const omitted = ctx.omittedRows
    ? `\n后面还有 ${ctx.omittedRows} 行没有逐行贴出，但上面的列概况覆盖了全部 ${ctx.rowCount} 行。`
    : ''
  return `你是标签设计助手。用户要在【已经有数据和版式的项目】上微调，不是从头重做。
动手前必须读完下面四段：布局、数据、打印设置、排版。微调要依据数据里的空值、内容长短和份数，不要只看列名。

# 1. 布局（标签上的组件，坐标相对标签左上角，单位毫米。数组越靠后越在上层）
标签尺寸：${ctx.label.width} mm × ${ctx.label.height} mm
当前选中：${ctx.selectedIds?.length ? ctx.selectedIds.join('、') : '无'}
${JSON.stringify(ctx.components)}

# 2. 数据（已经导入的行，row 从 1 开始）
列：${ctx.fields.length ? ctx.fields.join('、') : '（还没有列）'}
每一列的空值与最长内容（按全部 ${ctx.rowCount} 行统计）：
${JSON.stringify(ctx.profile)}
逐行数据（最多 ${ADJUST_ROW_CAP} 行）：
${JSON.stringify(ctx.rows)}${omitted}

# 3. 打印设置
${JSON.stringify(ctx.print)}
- copies：整单份数。copiesColumn 有值时，以该列数字为准，小于 1 的行跳过，不再乘 copies
- serialEnabled + serialStart：开启后模板里的 {{序号}} 每打一张加 1
- media：gap 间隙 / mark 黑标 / continuous 连续纸。dpi 只能是 203 或 300。direction：1 正向，0 反向
- offsetXMm / offsetYMm：热敏本机校准，正数让内容向右/下移（毫米）。scalePercent：整张缩放，100 为原尺寸，常见 90～110
- 用户说「打歪了 / 偏右 / 偏大」时改这三项；「再往右 1mm」要在当前 offsetXMm 上加减，不要从 0 重算

# 4. 排版（一张纸上怎么排这些标签）
纸张 ${ctx.paper.width}×${ctx.paper.height} mm，边距 ${JSON.stringify(ctx.margin)}
标签外观：${JSON.stringify({ showBorder: !!ctx.label.showBorder, borderColor: ctx.label.borderColor, borderWidth: ctx.label.borderWidth, backgroundColor: ctx.label.backgroundColor })}
字段映射（模板字段 → 数据列）：${JSON.stringify(ctx.fieldMap || {})}
${JSON.stringify(ctx.layout)}
- mode=single 是一张纸一个标签；mode=auto 是按行列铺满
- cols / rows 是每页几列几行，hGap / vGap 是标签间距（毫米）

# 输出 JSON 形状（没有改动的键整个省略）
{
  "summary": "一句话说明改了什么",
  "componentUpdates": [{ "id": "必须是现有组件 id", "fontSize": 16, "fontFamily": "SimHei", "fill": "#dc2626", "hideIfEmpty": true, "text": "{{价格}}", "binding": "价格", "type": "barcode", "format": "CODE128", "cells": { "0,1": { "text": "{{价格}}", "binding": "价格" } } }],
  "componentAdds": [],
  "componentRemoves": [],
  "order": ["在下层的 id", "在上层的 id"],
  "sheet": {
    "paper": { "width": 210, "height": 297 },
    "margin": { "left": 5, "top": 5, "right": 5, "bottom": 5 },
    "label": { "width": 50, "height": 30, "showBorder": true, "borderColor": "#000000", "borderWidth": 0.3, "backgroundColor": "#ffffff" },
    "layout": { "mode": "auto", "cols": 3, "rows": 8, "hGap": 2, "vGap": 2 }
  },
  "print": { "copies": 1, "copiesColumn": "份数", "serialEnabled": true, "serialStart": 1, "collate": false, "range": "all", "media": "gap", "gapMm": 2, "dpi": 203, "direction": 1, "offsetXMm": 0, "offsetYMm": 0, "scalePercent": 100 },
  "data": {
    "addColumns": ["份数"],
    "renameColumns": [{ "from": "价格", "to": "单价" }],
    "removeColumns": [],
    "setColumn": [{ "column": "份数", "value": "1" }],
    "setCells": [{ "row": 1, "column": "份数", "value": "2" }],
    "fieldMap": { "商品名称": "产品名称" }
  }
}

# 规则
- 只能输出一个 JSON 对象，不要解释、不要 Markdown 围栏
- 改布局优先 componentUpdates，用现有 id。不要为了改字号把全部组件重写一遍
- 用户说「这个」「选中的」时，只改「当前选中」里的 id。没选中就按组件 name 对上那一个
- 更换组件种类必须在 componentUpdates 里写 type，例如二维码改成条形码：{ "id": "现有id", "type": "barcode" }。保留原来的 binding 和文字。只在 summary 里说「已改成条形码」不会生效
- 文字还能改 fontFamily（Microsoft YaHei、SimSun、SimHei、KaiTi、Arial）、textAlign、fontWeight。条码 format 只能是 CODE128、EAN13、CODE39。日期 source 是 now 或 field；序号 source 是 print 或 field（可改 prefix/suffix/pad）；勾选框可改 binding、checkedChar、uncheckedChar；椭圆可改 fill/stroke
- 表格用 rows、cols，以及 cells 的「行,列」只写要改的格子（text、binding、type 为 text/qrcode/barcode/image）
- 调整叠放顺序用 order，数组最后一个盖在最上面。没写到的组件保持原位
- 字段名对不上时写 data.fieldMap，键是模板字段，值是已经存在的数据列
- 标签边框和底色写在 sheet.label 的 showBorder、borderColor、borderWidth、backgroundColor
- 打印范围 print.range 为 all，或 custom 并给出 rangeStart、rangeEnd（从 1 开始）
- 内容为空的列，对应组件可以设 hideIfEmpty。用户要暂时不显示某个组件时，给它设 hidden: true；hidden 是画布和打印都不出现，hideIfEmpty 只在这一格没内容时跳过
- 流水号写在 text 的 {{序号}} 里，并打开 print.serialEnabled
- 数据里的份数各不相同时，用 print.copiesColumn 指向那一列，不要把整单份数设成某一个格子的值
- 热敏整张偏移/缩放：只改 print.offsetXMm、offsetYMm、scalePercent；不要为此移动每个组件的 left/top
- 用户消息若附图（实打照片），优先根据照片估计校准，并在 summary 里用中文说明你看到的偏差（例如「偏右约 2mm」）
- 排版只在用户提到纸张、每页几张、间距时才写入 sheet
- row 从 1 开始。setColumn 会改这一列的每一行，只在用户明确说「每一行都……」时使用
- 不要发明数据列。新列必须先出现在 addColumns
- 用户没提到的打印项和排版不要改`
}

/** 把 AI 的 print 补丁拆成「项目打印设置」与「本机热敏校准」 */
export function splitPrintPatch(print) {
  if (!print || typeof print !== 'object') return { printConfig: null, calibrate: null }
  const {
    offsetXMm,
    offsetYMm,
    scalePercent,
    ...rest
  } = print
  const calPatch = {}
  if (offsetXMm != null) calPatch.offsetXMm = offsetXMm
  if (offsetYMm != null) calPatch.offsetYMm = offsetYMm
  if (scalePercent != null) calPatch.scalePercent = scalePercent
  return {
    printConfig: Object.keys(rest).length ? rest : null,
    calibrate: Object.keys(calPatch).length ? calPatch : null
  }
}

/**
 * 把上一轮对话带上，这样「再大一点」「还是不对」才接得上。
 * opts.imageDataUrl：实打照片（data URL），走 OpenAI 兼容多模态 content 数组。
 */
export function buildAdjustMessages(system, history, instruction, opts = {}) {
  const prior = (Array.isArray(history) ? history : []).slice(-8).filter(m => m && m.text).map(m => ({
    role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.text).slice(0, 800)
  }))
  const text = String(instruction || '')
  const imageDataUrl = typeof opts.imageDataUrl === 'string' ? opts.imageDataUrl.trim() : ''
  let userContent = text
  if (imageDataUrl.startsWith('data:image/')) {
    userContent = [
      { type: 'text', text: text || '请根据附图微调。' },
      { type: 'image_url', image_url: { url: imageDataUrl } }
    ]
  }
  return [
    { role: 'system', content: system },
    ...prior,
    { role: 'user', content: userContent }
  ]
}

/** 调整结果是对象。不能走「找第一个数组」的解析，否则会把 componentUpdates 当成整份结果。 */
export function parseAIPlan(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('AI 返回为空')
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const direct = JSON.parse(s)
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct
  } catch (e) { /* 继续找外层对象 */ }
  const start = s.indexOf('{')
  if (start < 0) throw new Error('调整结果必须是 JSON 对象')
  const end = findMatchingClose(s, start)
  const obj = JSON.parse(s.slice(start, end + 1))
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('调整结果必须是 JSON 对象')
  return obj
}

const PATCH_KEYS = ['type', 'name', 'text', 'binding', 'fontSize', 'fontFamily', 'fill', 'fontWeight', 'textAlign', 'hideIfEmpty', 'hidden', 'format', 'stroke', 'strokeWidth', 'src', 'left', 'top', 'width', 'height', 'angle', 'rx', 'source', 'rows', 'cols', 'cellPadding', 'borderColor', 'borderWidth', 'headerRow', 'headerBg', 'vAlign', 'cells', 'colWidths', 'prefix', 'suffix', 'pad', 'checkedChar', 'uncheckedChar', 'checkedValue']

function cleanName(s) {
  return String(s ?? '').trim().replace(/[{}]/g, '').slice(0, 40)
}

function projectedFields(fields, data) {
  const set = new Set(fields || [])
  for (const name of data.addColumns) set.add(name)
  for (const { from, to } of data.renameColumns) {
    set.delete(from)
    set.add(to)
  }
  for (const name of data.removeColumns) set.delete(name)
  return set
}

function normalizeDataOps(raw, fields, rowCount, warnings) {
  const data = { addColumns: [], renameColumns: [], removeColumns: [], setColumn: [], setCells: [] }
  const existing = new Set(fields || [])
  const added = new Set()
  for (const name of (raw.addColumns || []).slice(0, 8)) {
    const n = cleanName(name)
    if (!n || n === '__id' || existing.has(n) || added.has(n)) continue
    added.add(n)
    data.addColumns.push(n)
  }
  const renamedFrom = new Set()
  for (const item of (raw.renameColumns || []).slice(0, 8)) {
    const from = cleanName(item?.from)
    const to = cleanName(item?.to)
    if (!from || !to || from === to) continue
    if (!existing.has(from) || renamedFrom.has(from) || existing.has(to) || added.has(to)) {
      warnings.push(`列重命名「${from || '?'}」→「${to || '?'}」无法执行，已跳过`)
      continue
    }
    renamedFrom.add(from)
    added.add(to)
    existing.delete(from)
    data.renameColumns.push({ from, to })
  }
  const alive = projectedFields(fields, data)
  for (const name of (raw.removeColumns || []).slice(0, 8)) {
    const n = cleanName(name)
    if (!n || !alive.has(n)) continue
    if (alive.size <= 1) {
      warnings.push('至少保留 1 个字段，已跳过删除')
      continue
    }
    alive.delete(n)
    data.removeColumns.push(n)
  }
  const after = projectedFields(fields, data)
  for (const item of (raw.setColumn || []).slice(0, 8)) {
    const column = cleanName(item?.column)
    if (!column || !after.has(column)) {
      warnings.push(`整列赋值「${column || '?'}」不在数据列里，已跳过`)
      continue
    }
    data.setColumn.push({ column, value: String(item?.value ?? '').slice(0, 500) })
  }
  const maxRow = Math.max(0, Number(rowCount) || 0)
  for (const item of (raw.setCells || []).slice(0, 80)) {
    const column = cleanName(item?.column)
    const row = Math.floor(Number(item?.row))
    if (!column || !after.has(column) || !Number.isFinite(row) || row < 1 || (maxRow && row > maxRow)) {
      warnings.push(`单元格第 ${item?.row} 行「${column || '?'}」无法写入，已跳过`)
      continue
    }
    data.setCells.push({ row, column, value: String(item?.value ?? '').slice(0, 500) })
  }
  data.fieldMap = []
  if (raw.fieldMap && typeof raw.fieldMap === 'object' && !Array.isArray(raw.fieldMap)) {
    for (const [from, to] of Object.entries(raw.fieldMap).slice(0, 20)) {
      const a = cleanName(from)
      const b = cleanName(to)
      if (!a || !b) continue
      if (!after.has(b)) {
        warnings.push(`字段映射的数据列「${b}」不存在，已跳过`)
        continue
      }
      data.fieldMap.push({ from: a, to: b })
    }
  }
  return data
}

function normalizePrintPatch(raw, fields, warnings) {
  if (!raw || typeof raw !== 'object') return null
  const out = {}
  if (raw.copies != null) {
    const n = Math.floor(Number(raw.copies))
    if (Number.isFinite(n)) out.copies = Math.min(999, Math.max(1, n))
  }
  if (raw.copiesColumn != null) {
    const col = cleanName(raw.copiesColumn)
    if (!col) out.copiesColumn = ''
    else if (fields.has(col)) out.copiesColumn = col
    else warnings.push(`份数列「${col}」不存在，已忽略`)
  }
  if (typeof raw.serialEnabled === 'boolean') out.serialEnabled = raw.serialEnabled
  if (raw.serialStart != null) {
    const n = Math.floor(Number(raw.serialStart))
    if (Number.isFinite(n)) out.serialStart = Math.max(0, n)
  }
  if (typeof raw.collate === 'boolean') out.collate = raw.collate
  if (['gap', 'mark', 'continuous'].includes(raw.media)) out.media = raw.media
  else if (raw.media != null) warnings.push('走纸方式只能是间隙、黑标或连续纸')
  if (raw.gapMm != null) {
    const n = Number(raw.gapMm)
    if (Number.isFinite(n)) out.gapMm = clampGapMm(n, 0)
  }
  if (raw.dpi != null) {
    const n = Number(raw.dpi)
    if (n === 203 || n === 300) out.dpi = n
    else warnings.push('分辨率只接受 203 或 300')
  }
  if (raw.direction != null) {
    const n = Number(raw.direction)
    if (n === 0 || n === 1) out.direction = n
  }
  if (raw.range === 'all' || raw.range === 'custom') out.range = raw.range
  else if (raw.range != null) warnings.push('打印范围只能是全部或自定义')
  for (const key of ['rangeStart', 'rangeEnd']) {
    if (raw[key] == null) continue
    const n = Math.floor(Number(raw[key]))
    if (Number.isFinite(n)) out[key] = Math.min(9999, Math.max(1, n))
  }
  // 热敏本机校准：只收录模型明确写出的键；套用时与现有档案合并
  if (raw.offsetXMm != null || raw.offsetYMm != null || raw.scalePercent != null) {
    const cal = normalizeCalibrate({
      offsetXMm: raw.offsetXMm != null ? raw.offsetXMm : 0,
      offsetYMm: raw.offsetYMm != null ? raw.offsetYMm : 0,
      scalePercent: raw.scalePercent != null ? raw.scalePercent : 100
    })
    if (raw.offsetXMm != null) out.offsetXMm = cal.offsetXMm
    if (raw.offsetYMm != null) out.offsetYMm = cal.offsetYMm
    if (raw.scalePercent != null) out.scalePercent = cal.scalePercent
  }
  return Object.keys(out).length ? out : null
}

function hexColor(v) {
  const s = String(v || '').trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s.toLowerCase()
  if (s === 'transparent') return s
  return null
}

function mm(v, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.round(clamp(n, min, max) * 10) / 10
}

function normalizeSheet(raw, warnings) {
  if (!raw || typeof raw !== 'object') return null
  const out = {}
  if (raw.paper && typeof raw.paper === 'object') {
    const paper = {}
    const w = mm(raw.paper.width, 20, 2000)
    const h = mm(raw.paper.height, 20, 2000)
    if (w != null) paper.width = w
    if (h != null) paper.height = h
    if (Object.keys(paper).length) out.paper = paper
  }
  if (raw.margin && typeof raw.margin === 'object') {
    const margin = {}
    for (const side of ['top', 'right', 'bottom', 'left']) {
      if (raw.margin[side] == null) continue
      const n = mm(raw.margin[side], 0, 80)
      if (n != null) margin[side] = n
    }
    if (Object.keys(margin).length) out.margin = margin
  }
  if (raw.label && typeof raw.label === 'object') {
    const label = {}
    const w = mm(raw.label.width, 5, 2000)
    const h = mm(raw.label.height, 5, 2000)
    if (w != null) label.width = w
    if (h != null) label.height = h
    if (typeof raw.label.showBorder === 'boolean') label.showBorder = raw.label.showBorder
    const border = hexColor(raw.label.borderColor)
    const bg = hexColor(raw.label.backgroundColor)
    if (border) label.borderColor = border
    if (bg) label.backgroundColor = bg
    if (raw.label.borderWidth != null) {
      const bw = mm(raw.label.borderWidth, 0, 5)
      if (bw != null) label.borderWidth = bw
    }
    if (Object.keys(label).length) out.label = label
  }
  if (raw.layout && typeof raw.layout === 'object') {
    const layout = {}
    if (raw.layout.mode === 'single' || raw.layout.mode === 'auto') layout.mode = raw.layout.mode
    else if (raw.layout.mode != null) warnings.push('排版模式只能是单张或自动')
    for (const key of ['cols', 'rows']) {
      if (raw.layout[key] == null) continue
      const n = Math.floor(Number(raw.layout[key]))
      if (Number.isFinite(n)) layout[key] = Math.min(40, Math.max(1, n))
    }
    for (const key of ['hGap', 'vGap']) {
      if (raw.layout[key] == null) continue
      const n = mm(raw.layout[key], 0, 40)
      if (n != null) layout[key] = n
    }
    if (layout.cols != null || layout.rows != null) layout.sizingMode = 'manual'
    if (Object.keys(layout).length) out.layout = layout
  }
  return Object.keys(out).length ? out : null
}

/** 二维码改条形码这类换种类：补上新种类必须有的字段，避免画布仍按旧类型画。 */
function applyTypeChange(existing, patch) {
  if (!patch.type || !existing || patch.type === existing.type) return patch
  const next = { ...patch }
  if (patch.type === 'barcode' && !next.format) next.format = existing.format || 'CODE128'
  if (patch.type === 'barcode' && next.height == null) {
    const h = Number(existing.height) || 0
    const w = Number(next.width ?? existing.width) || 0
    if (h > 14 && w && h > w * 0.45) next.height = 12
  }
  if (patch.type === 'text' || patch.type === 'serial' || patch.type === 'checkbox') {
    if (next.fontSize == null) next.fontSize = existing.fontSize || 12
    if (!next.fill) next.fill = existing.fill || '#000000'
    if (!next.fontWeight) next.fontWeight = existing.fontWeight || 'normal'
    if (!next.textAlign) next.textAlign = existing.textAlign || (patch.type === 'checkbox' ? 'center' : 'left')
    next.fontFamily = existing.fontFamily || 'Microsoft YaHei'
  }
  if (patch.type === 'text') {
    if (next.text == null) next.text = existing.text || (existing.binding ? `{{${existing.binding}}}` : '')
  }
  if (patch.type === 'serial') {
    if (next.source == null) next.source = existing.source === 'field' ? 'field' : 'print'
    if (next.pad == null) next.pad = existing.pad ?? 4
  }
  if (patch.type === 'ellipse') {
    if (!next.stroke) next.stroke = existing.stroke || '#000000'
    if (next.strokeWidth == null) next.strokeWidth = existing.strokeWidth ?? 1
    if (next.fill == null) next.fill = existing.fill || 'transparent'
  }
  const oldLabel = defaultName(existing.type)
  if (!next.name && (!existing.name || existing.name === oldLabel || existing.name === existing.type)) {
    next.name = defaultName(patch.type)
  }
  return next
}

function normalizeComponentPatch(raw, LW, LH) {
  const patch = {}
  for (const key of PATCH_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    const v = raw[key]
    if (key === 'type') {
      const type = String(v || '').toLowerCase()
      if (VALID_TYPES.has(type)) patch.type = type
      continue
    }
    if (key === 'hideIfEmpty' || key === 'hidden') {
      if (typeof v === 'boolean') patch[key] = v
      continue
    }
    if (key === 'fontWeight') {
      if (v === 'bold' || v === 'normal') patch.fontWeight = v
      continue
    }
    if (key === 'textAlign') {
      if (v === 'left' || v === 'center' || v === 'right') patch.textAlign = v
      continue
    }
    if (key === 'fontFamily') {
      if (FONTS.has(v)) patch.fontFamily = v
      continue
    }
    if (key === 'source') {
      if (v === 'static' || v === 'field' || v === 'now' || v === 'print') patch.source = v
      continue
    }
    if (key === 'pad') {
      const n = Math.floor(Number(v))
      if (Number.isFinite(n)) patch.pad = Math.min(12, Math.max(0, n))
      continue
    }
    if (key === 'vAlign') {
      if (v === 'top' || v === 'middle' || v === 'bottom') patch.vAlign = v
      continue
    }
    if (key === 'headerRow') {
      if (typeof v === 'boolean') patch.headerRow = v
      continue
    }
    if (key === 'cells') {
      const cells = normalizeCells(v)
      if (Object.keys(cells).length) patch.cells = cells
      continue
    }
    if (key === 'colWidths') {
      if (Array.isArray(v) && v.length) {
        patch.colWidths = v.slice(0, 20).map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0)
      }
      continue
    }
    if (['rows', 'cols'].includes(key)) {
      const n = Math.floor(Number(v))
      if (Number.isFinite(n)) patch[key] = Math.min(20, Math.max(1, n))
      continue
    }
    if (['fontSize', 'strokeWidth', 'angle', 'left', 'top', 'width', 'height', 'rx', 'cellPadding', 'borderWidth'].includes(key)) {
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      patch[key] = n
      continue
    }
    patch[key] = String(v ?? '').slice(0, 500)
  }
  if (patch.left != null) patch.left = round2(clamp(patch.left, 0, Math.max(0, LW - 1)))
  if (patch.top != null) patch.top = round2(clamp(patch.top, 0, Math.max(0, LH - 1)))
  if (patch.width != null) patch.width = round2(Math.max(1, patch.width))
  if (patch.height != null) patch.height = round2(Math.max(0.1, patch.height))
  if (patch.fontSize != null) patch.fontSize = Math.min(96, Math.max(6, Math.round(patch.fontSize)))
  if (patch.angle != null) patch.angle = Math.round(clamp(patch.angle, -360, 360))
  if (patch.rx != null) patch.rx = round2(clamp(patch.rx, 0, 20))
  if (patch.cellPadding != null) patch.cellPadding = round2(clamp(patch.cellPadding, 0, 10))
  if (patch.borderWidth != null) patch.borderWidth = round2(clamp(patch.borderWidth, 0, 5))
  return patch
}

function normalizeCells(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw).slice(0, 40)) {
    if (!/^\d+,\d+$/.test(k) || !v || typeof v !== 'object') continue
    const cell = {}
    if (v.text != null) cell.text = String(v.text).slice(0, 200)
    if (v.binding != null) cell.binding = cleanName(v.binding)
    if (CELL_TYPES.has(v.type)) cell.type = v.type
    if (BARCODE_FORMATS.has(v.format)) cell.format = v.format
    if (Object.keys(cell).length) out[k] = cell
  }
  return out
}

function resolveUpdateId(item, ctx, ids) {
  let id = String(item?.id || '')
  if (ids.has(id)) return id
  const selected = Array.isArray(ctx.selectedIds) ? ctx.selectedIds : []
  if ((!id || id === 'selected' || id === '选中') && selected.length === 1 && ids.has(selected[0])) return selected[0]
  const named = (ctx.components || []).filter(c => c.name && (c.name === id || (item?.name && c.name === item.name)))
  if (named.length === 1) return named[0].id
  return id
}

/**
 * 把模型返回的调整对象收成可直接套用的计划。未知组件、不存在的列、非法打印值会被丢掉并写入 warnings。
 */
export function normalizeAdjustPlan(raw, ctx = {}) {
  const warnings = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('调整结果必须是 JSON 对象')
  const fields = ctx.fields || []
  const LW = Number(ctx.labelWidth) || 100
  const LH = Number(ctx.labelHeight) || 50
  const ids = new Set((ctx.components || []).map(c => c.id).filter(Boolean))
  const data = normalizeDataOps(raw.data || {}, fields, ctx.rowCount || 0, warnings)
  const knownFields = projectedFields(fields, data)
  const print = normalizePrintPatch(raw.print, knownFields, warnings)
  const sheet = normalizeSheet(raw.sheet, warnings)

  const componentUpdates = []
  for (const item of (raw.componentUpdates || []).slice(0, 40)) {
    const id = resolveUpdateId(item, ctx, ids)
    if (!ids.has(id)) {
      warnings.push(`组件 ${id || '?'} 不在当前画布上，已跳过`)
      continue
    }
    const nested = item?.patch && typeof item.patch === 'object' && !Array.isArray(item.patch) ? item.patch : null
    const source = nested ? { ...nested, id } : item
    const existing = (ctx.components || []).find(c => c.id === id)
    const patch = applyTypeChange(existing, normalizeComponentPatch(source, LW, LH))
    const kind = patch.type || existing?.type
    if (patch.format && kind === 'barcode' && !BARCODE_FORMATS.has(patch.format)) {
      warnings.push(`条码格式 ${patch.format} 不支持，已跳过`)
      delete patch.format
    }
    if (patch.cells && existing?.type === 'table') {
      patch.cells = { ...(existing.cells || {}), ...patch.cells }
    }
    delete patch.id
    if (Object.keys(patch).length) componentUpdates.push({ id, patch })
    else warnings.push(`组件 ${id} 的修改没有套用上`)
  }

  const order = []
  if (Array.isArray(raw.order)) {
    const seen = new Set()
    for (const id of raw.order) {
      const s = String(id || '')
      if (!ids.has(s) || seen.has(s)) continue
      seen.add(s)
      order.push(s)
    }
  }

  let componentAdds = []
  if (Array.isArray(raw.componentAdds) && raw.componentAdds.length) {
    const added = validateAndNormalize(raw.componentAdds, {
      labelWidth: LW,
      labelHeight: LH,
      fields: [...knownFields]
    })
    componentAdds = added.components
    warnings.push(...added.warnings.filter(w => !w.startsWith('以下字段未在生成结果中找到绑定')))
  }

  const componentRemoves = []
  for (const id of (raw.componentRemoves || []).slice(0, 40)) {
    const s = String(id || '')
    if (ids.has(s)) componentRemoves.push(s)
    else if (s) warnings.push(`要删除的组件 ${s} 不存在，已跳过`)
  }

  const plan = {
    summary: String(raw.summary || '').trim().slice(0, 300),
    componentUpdates,
    componentAdds,
    componentRemoves,
    sheet,
    print,
    data,
    order
  }
  if (adjustPlanIsEmpty(plan)) warnings.push('没有可应用的改动')
  return { plan, warnings }
}

export function adjustPlanIsEmpty(plan) {
  if (!plan) return true
  const d = plan.data || {}
  return !plan.componentUpdates?.length
    && !plan.componentAdds?.length
    && !plan.componentRemoves?.length
    && !plan.sheet
    && !plan.print
    && !d.addColumns?.length
    && !d.renameColumns?.length
    && !d.removeColumns?.length
    && !d.setColumn?.length
    && !d.setCells?.length
    && !d.fieldMap?.length
    && !plan.order?.length
}

export function describeAdjustPlan(plan) {
  if (!plan) return []
  const lines = []
  if (plan.summary) lines.push(plan.summary)
  if (plan.componentUpdates?.length) lines.push(`调整 ${plan.componentUpdates.length} 个组件`)
  if (plan.componentAdds?.length) lines.push(`新增 ${plan.componentAdds.length} 个组件`)
  if (plan.componentRemoves?.length) lines.push(`删除 ${plan.componentRemoves.length} 个组件`)
  if (plan.order?.length) lines.push('调整图层顺序')
  if (plan.sheet) {
    const bits = []
    if (plan.sheet.paper) bits.push(`纸张 ${plan.sheet.paper.width || '?'}×${plan.sheet.paper.height || '?'}`)
    if (plan.sheet.label) bits.push(`标签 ${plan.sheet.label.width || '?'}×${plan.sheet.label.height || '?'}`)
    if (plan.sheet.layout?.mode === 'single') bits.push('单张')
    if (plan.sheet.layout?.mode === 'auto') bits.push('自动排版')
    if (plan.sheet.layout?.cols || plan.sheet.layout?.rows) bits.push(`${plan.sheet.layout.cols || '?'} 列 × ${plan.sheet.layout.rows || '?'} 行`)
    if (bits.length) lines.push('排版：' + bits.join('，'))
  }
  if (plan.print) {
    const p = plan.print
    const bits = []
    if (p.copies != null) bits.push(`份数 ${p.copies}`)
    if (p.copiesColumn != null) bits.push(p.copiesColumn ? `按列「${p.copiesColumn}」` : '取消按列份数')
    if (p.serialEnabled != null) bits.push(p.serialEnabled ? `序号从 ${p.serialStart ?? 1} 起` : '关闭序号')
    if (p.media) bits.push(p.media === 'mark' ? '黑标' : p.media === 'continuous' ? '连续纸' : '间隙')
    if (p.dpi) bits.push(`${p.dpi} dpi`)
    if (p.offsetXMm != null || p.offsetYMm != null) {
      bits.push(`偏移 ${p.offsetXMm ?? '·'},${p.offsetYMm ?? '·'} mm`)
    }
    if (p.scalePercent != null) bits.push(`缩放 ${p.scalePercent}%`)
    if (bits.length) lines.push('打印：' + bits.join('，'))
  }
  const d = plan.data || {}
  if (d.addColumns?.length) lines.push('新增列：' + d.addColumns.join('、'))
  if (d.renameColumns?.length) lines.push('重命名列：' + d.renameColumns.map(x => `${x.from}→${x.to}`).join('、'))
  if (d.removeColumns?.length) lines.push('删除列：' + d.removeColumns.join('、'))
  if (d.setColumn?.length) lines.push('整列填写：' + d.setColumn.map(x => x.column).join('、'))
  if (d.setCells?.length) lines.push(`修改 ${d.setCells.length} 个单元格`)
  if (d.fieldMap?.length) lines.push('字段映射：' + d.fieldMap.map(x => `${x.from}→${x.to}`).join('、'))
  return lines
}
