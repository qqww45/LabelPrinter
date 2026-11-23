/**
 * 二维码渲染：QR 走内置矩阵绘制，其余走本地 bwip-js（无账号、无云端）。
 */
import bwipjs from 'bwip-js'
import { qrToCanvas } from './cellImage.js'
import { lookup2DSymbology } from './symbologyCatalog.js'

const BWIP_BCID = {
  QR: 'qrcode',
  PDF417: 'pdf417',
  DATAMATRIX: 'datamatrix',
  AZTEC: 'azteccode',
  MICROQR: 'microqrcode',
  HANXIN: 'hanxin'
}

function rasterScale(targetPx) {
  const t = Number(targetPx) || 200
  return Math.max(2, Math.min(12, Math.round(t / 48)))
}

/** 浏览器 / 有 document 时绘制到 canvas */
export function twoDToCanvas(text, format, targetPx = 200, opts = {}) {
  const id = String(format || 'QR').toUpperCase()
  const value = String(text == null || text === '' ? ' ' : text)

  if (id === 'QR') {
    return qrToCanvas(value, targetPx, opts)
  }

  const bcid = BWIP_BCID[id] || lookup2DSymbology(id)?.id?.toLowerCase()
  if (!bcid || typeof document === 'undefined') return null

  const cv = document.createElement('canvas')
  try {
    bwipjs.toCanvas(cv, {
      bcid,
      text: value,
      scale: rasterScale(targetPx),
      padding: opts.margin ?? 1,
      backgroundcolor: opts.light || 'ffffff',
      barcolor: opts.dark ? String(opts.dark).replace('#', '') : '000000'
    })
    return cv
  } catch (e) {
    return null
  }
}

/** Node 单测：编码是否可生成（bwip-js v4 toBuffer 为 Promise） */
export async function twoDEncodes(text, format) {
  const id = String(format || 'QR').toUpperCase()
  const value = String(text == null ? '' : text).trim() || 'TEST'
  const bcid = id === 'QR' ? 'qrcode' : BWIP_BCID[id]
  if (!bcid) return false
  try {
    const buf = await bwipjs.toBuffer({ bcid, text: value, scale: 2, padding: 1 })
    return !!(buf && (buf.length || buf.byteLength))
  } catch {
    return false
  }
}

export function twoDBcid(format) {
  const id = String(format || 'QR').toUpperCase()
  return BWIP_BCID[id] || null
}