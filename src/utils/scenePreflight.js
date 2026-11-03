/**
 * 按行业场景加权的行级体检（价签 / 面单 / 资产等）。
 */
import { resolveRow, codePayload } from './render.js'
import { fieldRefsFromText } from './templateExpr.js'
import { barcodeScanIssue } from './barcodeScan.js'
import { safeImageSrc } from './escapeHtml.js'
import { getScenePack, SCENE_PACKS } from './scenePacks.js'

const PHONE_RE = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/

function fieldNamesOnComponent(c) {
  const set = new Set()
  if (!c) return []
  if (c.binding) set.add(c.binding)
  const scan = (text) => {
    for (const k of fieldRefsFromText(text)) set.add(k)
  }
  scan(c.text)
  if (c.type === 'table' && c.cells) {
    for (const cell of Object.values(c.cells)) {
      if (!cell) continue
      if (cell.binding) set.add(cell.binding)
      scan(cell.text)
    }
  }
  return Array.from(set)
}

function collectImageFieldFailures(components, resolved, rowIndex) {
  const failures = []
  const push = (code, title, detail, ids = []) => {
    failures.push({ rowIndex, code, title, detail, ids })
  }
  for (const c of components || []) {
    if (!c || c.type !== 'image' || c.source !== 'field' || !c.binding) continue
    const raw = resolved[c.binding]
    if (raw == null || String(raw).trim() === '') {
      if (!c.hideIfEmpty) {
        push('scene-empty-image', '图片字段为空', `第 ${rowIndex + 1} 行「${c.binding}」没有图片地址。`, [c.id])
      }
      continue
    }
    if (!safeImageSrc(String(raw).trim())) {
      push(
        'scene-bad-image-url',
        '图片地址无效',
        `第 ${rowIndex + 1} 行「${c.binding}」不是可用的 http(s) 或 data:image 地址。`,
        [c.id]
      )
    }
  }
  for (const c of components || []) {
    if (!c || c.type !== 'table' || !c.cells) continue
    for (const cell of Object.values(c.cells)) {
      if (!cell || cell.type !== 'image' || !cell.binding) continue
      const raw = resolved[cell.binding]
      if (raw == null || String(raw).trim() === '') continue
      if (!safeImageSrc(String(raw).trim())) {
        push(
          'scene-bad-image-url',
          '表格图片地址无效',
          `第 ${rowIndex + 1} 行表格图片列「${cell.binding}」地址不可用。`,
          [c.id]
        )
      }
    }
  }
  return failures
}

function rowText(row, names) {
  for (const n of names) {
    const v = row?.[n]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function firstBindingMatch(components, names) {
  const set = new Set(names)
  for (const c of components || []) {
    if (c?.binding && set.has(c.binding)) return c.binding
    for (const f of fieldNamesOnComponent(c)) {
      if (set.has(f)) return f
    }
  }
  return ''
}

export function inferSceneId(project) {
  const id = project?.meta?.sceneId
  if (id && getScenePack(id)) return id
  for (const pack of SCENE_PACKS) {
    if (project?.meta?.name && String(project.meta.name).includes(pack.name.slice(0, 2))) return pack.id
  }
  return ''
}

/**
 * @returns {Array<{ rowIndex:number, code:string, title:string, detail:string, ids?:string[] }>}
 */
export function collectSceneRowFailures({
  sceneId = '',
  components = [],
  rows = [],
  fieldMap = {}
} = {}) {
  if (!Array.isArray(rows) || !rows.length) return []
  const failures = []
  const scene = String(sceneId || '').trim()

  const priceNames = ['价格', '零售价', '售价', '单价']
  const phoneNames = ['电话', '手机', '收件人电话', '联系电话']
  const idNames = ['资产编号', '编号', '固定资产编号']
  const barcodeComps = (components || []).filter((c) => c && c.type === 'barcode')

  rows.forEach((row, rowIndex) => {
    if (row?.__print === false) return
    const resolved = resolveRow(row, fieldMap)

    failures.push(...collectImageFieldFailures(components, resolved, rowIndex))

    if (scene === 'retail-price' || scene === 'retail') {
      const priceKey = firstBindingMatch(components, priceNames)
      const price = priceKey ? rowText(resolved, [priceKey]) : rowText(resolved, priceNames)
      if (!price) {
        failures.push({
          rowIndex,
          code: 'scene-empty-price',
          title: '价格为空',
          detail: `第 ${rowIndex + 1} 行没有价格，价签上会留白。`,
          ids: []
        })
      }
      for (const c of barcodeComps) {
        const payload = codePayload(c, resolved)
        if (!payload) {
          failures.push({
            rowIndex,
            code: 'scene-empty-barcode',
            title: '条码为空',
            detail: `第 ${rowIndex + 1} 行条码字段为空。`,
            ids: [c.id]
          })
          break
        }
        const issue = barcodeScanIssue({
          format: c.format,
          value: payload,
          widthMm: c.width,
          heightMm: c.height
        })
        if (issue !== 'ok' && issue !== 'empty') {
          failures.push({
            rowIndex,
            code: 'scene-bad-barcode',
            title: '条码可能扫不过',
            detail: `第 ${rowIndex + 1} 行：${issue}`,
            ids: [c.id]
          })
          break
        }
      }
    }

    if (scene === 'express') {
      const phoneKey = firstBindingMatch(components, phoneNames)
      const phone = phoneKey ? rowText(resolved, [phoneKey]) : rowText(resolved, phoneNames)
      if (phone && !PHONE_RE.test(phone.replace(/\s/g, ''))) {
        failures.push({
          rowIndex,
          code: 'scene-bad-phone',
          title: '电话格式可疑',
          detail: `第 ${rowIndex + 1} 行电话「${phone}」不像常见手机/固话。`,
          ids: []
        })
      }
      if (!phone) {
        failures.push({
          rowIndex,
          code: 'scene-empty-phone',
          title: '电话为空',
          detail: `第 ${rowIndex + 1} 行没有收件电话。`,
          ids: []
        })
      }
    }

    if (scene === 'asset') {
      const idKey = firstBindingMatch(components, idNames)
      const idVal = idKey ? rowText(resolved, [idKey]) : rowText(resolved, idNames)
      if (!idVal) {
        failures.push({
          rowIndex,
          code: 'scene-empty-id',
          title: '资产编号为空',
          detail: `第 ${rowIndex + 1} 行没有资产编号。`,
          ids: []
        })
      }
    }

    // 所有场景：条码静区 / 最小高度（与 barcodeScan 一致）
    for (const c of barcodeComps) {
      const payload = codePayload(c, resolved)
      if (!payload) continue
      const issue = barcodeScanIssue({
        format: c.format,
        value: payload,
        widthMm: c.width,
        heightMm: c.height
      })
      if (issue === 'short' || issue === 'narrow') {
        failures.push({
          rowIndex,
          code: 'scene-barcode-size',
          title: '条码尺寸或静区不足',
          detail: `第 ${rowIndex + 1} 行条码格子 ${issue === 'short' ? '太矮' : '太窄'}，扫描可能不稳定。`,
          ids: [c.id]
        })
        break
      }
    }
  })

  return failures
}

export function sceneFailuresToIssues(failures = []) {
  if (!failures.length) return []
  const byCode = new Map()
  for (const f of failures) {
    if (!byCode.has(f.code)) byCode.set(f.code, [])
    byCode.get(f.code).push(f)
  }
  const issues = []
  for (const [code, list] of byCode) {
    const shown = list.slice(0, 8).map((x) => x.rowIndex + 1).join('、')
    const more = list.length > 8 ? ` 等 ${list.length} 行` : ''
    issues.push({
      level: code.includes('empty') || code.includes('bad') ? 'warn' : 'warn',
      code,
      title: list[0].title + (list.length > 1 ? `（${list.length} 行）` : ''),
      detail: `第 ${shown}${more} 行。${list[0].detail.replace(/^第 \d+ 行[，。]?/, '')}`,
      fix: 'row',
      rowIndex: list[0].rowIndex,
      ids: list[0].ids || [],
      rowFailures: list
    })
  }
  return issues
}
