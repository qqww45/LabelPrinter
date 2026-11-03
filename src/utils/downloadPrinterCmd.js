import { buildTSPL, buildZPL } from './printerCmd.js'
import { expandPrintLabels } from './printModel.js'
import { resolveRow } from './render.js'
import { getEffectiveCalibrate } from './effectiveCalibrate.js'
import { normalizeCalibrate } from './thermalCalibrate.js'
import { clampGapMm } from './thermalMedia.js'

function buildJob(project, displayRows) {
  const p = project
  const cfg = p.printConfig || {}
  const cal = getEffectiveCalibrate(p)
  const labels = expandPrintLabels(displayRows || [], cfg).map((item) => ({
    ...item,
    row: resolveRow(item.row, p.dataSource?.fieldMap)
  }))
  return {
    label: p.label,
    media: cfg.media,
    gapMm: clampGapMm(cfg.gapMm, 2),
    dpi: cfg.dpi,
    direction: cfg.direction,
    calibrate: cal,
    components: p.components,
    labels
  }
}

export function downloadPrinterCommand({ project, rows, kind = 'tspl' }) {
  const job = buildJob(project, rows)
  const text = kind === 'zpl' ? buildZPL(job) : buildTSPL(job)
  const ext = kind === 'zpl' ? '.zpl' : '.tspl'
  const name = (project.meta?.name || 'label').replace(/[^\w\u4e00-\u9fff-]+/g, '_') + ext
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  return { bytes: text.length, calibrate: normalizeCalibrate(job.calibrate) }
}

export function downloadCalibrationCommand({ project, kind = 'tspl' }) {
  const p = project
  const cfg = p.printConfig || {}
  const cal = getEffectiveCalibrate(p)
  const job = {
    label: p.label,
    media: cfg.media,
    gapMm: clampGapMm(cfg.gapMm, 2),
    dpi: cfg.dpi,
    direction: cfg.direction,
    calibrate: cal,
    calibrationOnly: true
  }
  const text = kind === 'zpl' ? buildZPL(job) : buildTSPL(job)
  const ext = kind === 'zpl' ? '.zpl' : '.tspl'
  const name = (p.meta?.name || 'label') + '-calibrate' + ext
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
