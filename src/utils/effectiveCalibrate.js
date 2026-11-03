/**
 * 热敏校准：项目内持久化优先，本机 profile 作回退（换浏览器仍可从项目 JSON 恢复）。
 */
import { normalizeCalibrate } from './thermalCalibrate.js'
import { getPrinterProfile } from './printerProfile.js'

export function getEffectiveCalibrate(project) {
  const raw = project?.printConfig?.calibrate
  if (raw && typeof raw === 'object') return normalizeCalibrate(raw)
  return getPrinterProfile()
}
