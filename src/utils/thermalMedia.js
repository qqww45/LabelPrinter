/**
 * 热敏纸「看纸」预设：把用户能看见的纸面特征映射到 media / gapMm。
 * 纯函数，不碰 DOM / 存储。
 */

export const MEDIA_LOOKS = Object.freeze([
  { id: 'gap', media: 'gap', gapMm: 2 },
  { id: 'mark', media: 'mark', gapMm: 3 },
  { id: 'continuous', media: 'continuous', gapMm: 0 }
])

/** 症状自助：与 UI / i18n 键对应 */
export const THERMAL_TROUBLES = Object.freeze(['blank', 'shift', 'scale'])

export function normalizeMedia(media) {
  if (media === 'mark' || media === 'continuous') return media
  return 'gap'
}

/** 间隙毫米：空值用 fallback，负数收成 0，超过 50 收成 50 */
export function clampGapMm(v, fallback = 2) {
  if (v == null || v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(50, Math.max(0, Math.round(n * 10) / 10))
}

export function mediaLookPreset(media) {
  const id = normalizeMedia(media)
  return MEDIA_LOOKS.find((x) => x.id === id) || MEDIA_LOOKS[0]
}

/**
 * 切换纸类型时写回 media + gapMm。
 * - 连续纸：间隙强制 0
 * - 从连续纸切回、或当前间隙无效：用该类型默认值
 * - 间隙 ↔ 黑标：保留用户已调过的 gapMm
 */
export function applyMediaLook(nextMedia, current = {}) {
  const media = normalizeMedia(nextMedia)
  if (media === 'continuous') return { media, gapMm: 0 }
  const prev = normalizeMedia(current.media)
  const defaults = mediaLookPreset(media)
  const curGap = Number(current.gapMm)
  if (prev === 'continuous' || !(curGap > 0)) {
    return { media, gapMm: defaults.gapMm }
  }
  return { media, gapMm: curGap }
}

export function isThermalTrouble(id) {
  return THERMAL_TROUBLES.includes(id)
}
