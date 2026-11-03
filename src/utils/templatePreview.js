import { BUILTIN_TEMPLATES } from './templates.js'

const GLYPH = {
  text: 'T',
  table: '⊞',
  qrcode: '▣',
  barcode: '▌',
  image: '▣',
  rect: '▭',
  line: '╱',
  date: '◷',
  serial: '#',
  checkbox: '☑',
  ellipse: '○'
}

export function getBuiltinTemplate(templateId) {
  return BUILTIN_TEMPLATES.find((t) => t.id === templateId) || null
}

/** @param {{ width: number, height: number }} label */
export function previewScaleForLabel(label, maxW, maxH, { min = 0.35, max = 8 } = {}) {
  if (!label?.width || !label?.height) return 1
  const s = Math.min(maxW / label.width, maxH / label.height)
  return Math.min(Math.max(s, min), max)
}

export function glyphForComponent(c) {
  if (!c) return ''
  if (c.type === 'text') {
    const raw = (c.text || '').replace(/\{\{([^}|]+).*\}\}/g, '$1').slice(0, 8)
    return raw || 'T'
  }
  return GLYPH[c.type] || c.type?.slice(0, 2) || '?'
}

export function compPreviewBox(c, scale) {
  return {
    left: `${c.left * scale}px`,
    top: `${c.top * scale}px`,
    width: `${Math.max(2, c.width * scale)}px`,
    height: `${Math.max(3, c.height * scale)}px`,
    transform: c.angle ? `rotate(${c.angle}deg)` : undefined,
    color: c.fill || '#111827',
    fontWeight: c.fontWeight === 'bold' ? '700' : '400',
    fontSize: `${Math.max(6, Math.min(14, (c.fontSize || 9) * scale * 0.85))}px`
  }
}

export function buildTemplatePreviewModel(template, maxW, maxH) {
  if (!template?.label) return null
  const scale = previewScaleForLabel(template.label, maxW, maxH)
  const w = Math.round(template.label.width * scale)
  const h = Math.round(template.label.height * scale)
  const border = template.label.showBorder
    ? `1px solid ${template.label.borderColor || '#94a3b8'}`
    : '1px solid rgba(148,163,184,0.45)'
  return {
    scale,
    widthPx: w,
    heightPx: h,
    surfaceStyle: {
      width: `${w}px`,
      height: `${h}px`,
      background: template.label.backgroundColor || '#ffffff',
      border
    },
    components: (template.components || []).map((c) => ({
      id: c.id,
      type: c.type,
      style: compPreviewBox(c, scale),
      label: glyphForComponent(c)
    }))
  }
}
