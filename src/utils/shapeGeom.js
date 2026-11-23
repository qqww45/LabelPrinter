/**
 * 箭头 / 折线几何：画布、预览、PDF、热敏共用。
 * 坐标均为 mm，相对组件 left/top。
 */

import { strokeStyleDash } from './controls.js'

/** @typedef {[number, number]} PointMm */

/** 默认折线（水平三段示例） */
export function defaultPolylinePoints(widthMm = 30, heightMm = 12) {
  const w = Math.max(4, Number(widthMm) || 30)
  const h = Math.max(4, Number(heightMm) || 12)
  return [
    [0, h * 0.8],
    [w * 0.35, h * 0.2],
    [w * 0.65, h * 0.75],
    [w, h * 0.35]
  ]
}

/**
 * @param {{ points?: PointMm[], width?: number, height?: number }} c
 * @returns {PointMm[]}
 */
export function polylinePointsMm(c) {
  const pts = Array.isArray(c?.points) ? c.points : []
  if (pts.length >= 2) {
    return pts.map((p) => [Number(p[0]) || 0, Number(p[1]) || 0])
  }
  return defaultPolylinePoints(c?.width, c?.height)
}

/**
 * 箭头主体线段 + 箭头三角（相对组件框，mm）
 * @param {{ width?: number, height?: number, arrowDirection?: string }} c
 */
export function arrowGeometryMm(c) {
  const w = Math.max(2, Number(c?.width) || 24)
  const h = Math.max(2, Number(c?.height) || 10)
  const dir = String(c?.arrowDirection || 'right').toLowerCase()
  const pad = Math.min(w, h) * 0.22
  const head = Math.min(w, h) * 0.38

  if (dir === 'left') {
    return {
      shaft: [[w - pad, h / 2], [pad + head, h / 2]],
      head: [[pad, h / 2], [pad + head, h / 2 - head * 0.55], [pad + head, h / 2 + head * 0.55]]
    }
  }
  if (dir === 'up') {
    return {
      shaft: [[w / 2, h - pad], [w / 2, pad + head]],
      head: [[w / 2, pad], [w / 2 - head * 0.55, pad + head], [w / 2 + head * 0.55, pad + head]]
    }
  }
  if (dir === 'down') {
    return {
      shaft: [[w / 2, pad], [w / 2, h - pad - head]],
      head: [[w / 2, h - pad], [w / 2 - head * 0.55, h - pad - head], [w / 2 + head * 0.55, h - pad - head]]
    }
  }
  return {
    shaft: [[pad, h / 2], [w - pad - head, h / 2]],
    head: [[w - pad, h / 2], [w - pad - head, h / 2 - head * 0.55], [w - pad - head, h / 2 + head * 0.55]]
  }
}

/** Fabric / HTML：点列转绝对坐标（加上组件偏移） */
export function offsetPointsMm(points, leftMm, topMm) {
  const ox = Number(leftMm) || 0
  const oy = Number(topMm) || 0
  return points.map(([x, y]) => [ox + x, oy + y])
}

/** PDF：折线点序列 [x1,y1,x2,y2,...] */
export function polylinePdfPoints(c, ox, oy) {
  const rel = polylinePointsMm(c)
  const out = []
  for (const [x, y] of rel) {
    out.push(ox + x, oy + y)
  }
  return out
}

export function lineDashForComponent(c) {
  return strokeStyleDash(c?.strokeStyle || 'solid')
}