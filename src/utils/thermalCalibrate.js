/**
 * 热敏本机校准：偏移 / 缩放（纯函数，不碰 DOM / 存储）。
 * 正的 offsetX/Y = 内容向右 / 向下；scalePercent=100 为原尺寸。
 */

export function normalizeCalibrate(raw = {}) {
  const offsetXMm = clampNum(raw.offsetXMm, -50, 50, 0)
  const offsetYMm = clampNum(raw.offsetYMm, -50, 50, 0)
  const scalePercent = scaleOrFallback(raw.scalePercent)
  return { offsetXMm, offsetYMm, scalePercent }
}

/** 空、0、负数视为没填，回到 100；过小或过大再夹到 50–150 */
function scaleOrFallback(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return 100
  return Math.min(150, Math.max(50, Math.round(n * 100) / 100))
}

function clampNum(v, min, max, fallback) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100))
}

export function calibrateScale(cal) {
  const c = normalizeCalibrate(cal)
  return c.scalePercent / 100
}

/** 把画布 mm 坐标变到指令坐标（先缩放再平移） */
export function transformPoint(x, y, cal) {
  const c = normalizeCalibrate(cal)
  const s = c.scalePercent / 100
  return {
    x: (Number(x) || 0) * s + c.offsetXMm,
    y: (Number(y) || 0) * s + c.offsetYMm
  }
}

export function transformSize(w, h, cal) {
  const s = calibrateScale(cal)
  return {
    w: (Number(w) || 0) * s,
    h: (Number(h) || 0) * s
  }
}

/** 对 printerCmd 的 piece 做校准（坐标 + 尺寸 + 字号） */
export function transformPiece(piece, cal) {
  if (!piece) return piece
  const c = normalizeCalibrate(cal)
  if (c.offsetXMm === 0 && c.offsetYMm === 0 && c.scalePercent === 100) return piece
  const s = c.scalePercent / 100
  const { x, y } = transformPoint(piece.x, piece.y, c)
  const out = { ...piece, x, y }
  if (piece.w != null) out.w = (Number(piece.w) || 0) * s
  if (piece.h != null) out.h = (Number(piece.h) || 0) * s
  if (piece.fontSize != null) out.fontSize = (Number(piece.fontSize) || 14) * s
  if (piece.strokeWidth != null) out.strokeWidth = (Number(piece.strokeWidth) || 1) * s
  return out
}

/**
 * 校准签几何：距边 1mm 的外框 + 中心十字（与标签 mm 一致）。
 * 首次校准请用偏移 0、缩放 100% 打印，量完再填补偿。
 */
export function calibrationPieces(label = {}) {
  const w = Math.max(5, Number(label.width) || 40)
  const h = Math.max(5, Number(label.height) || 30)
  const inset = Math.min(1, w / 4, h / 4)
  const cx = w / 2
  const cy = h / 2
  const stroke = 0.35
  return [
    {
      kind: 'rect',
      x: inset,
      y: inset,
      w: Math.max(1, w - inset * 2),
      h: Math.max(1, h - inset * 2),
      strokeWidth: 1
    },
    { kind: 'line', x: inset, y: cy, w: Math.max(1, w - inset * 2), h: stroke },
    { kind: 'line', x: cx, y: inset, w: stroke, h: Math.max(1, h - inset * 2) },
    {
      kind: 'text',
      text: `${round1(w)}x${round1(h)}mm`,
      x: inset + 1.5,
      y: inset + 1.5,
      fontSize: 10
    }
  ]
}

function round1(n) {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : String(r)
}
