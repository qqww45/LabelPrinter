import { BUILTIN_TEMPLATES } from './templates.js'
import { loadSampleDataset } from './samples.js'
import { autoMatchFieldMap, extractTemplateFields } from './render.js'

/** 30 秒体验：内置模板 + 示例 CSV + 字段映射（数据内嵌） */
export async function applyQuickStartPack(stores, { templateId = 'tpl_grocery_price', sampleId = 'retail' } = {}) {
  const { project, data } = stores
  const tpl = BUILTIN_TEMPLATES.find((t) => t.id === templateId)
  if (!tpl) throw new Error(`unknown template: ${templateId}`)
  project.applyTemplate(tpl)
  const parsed = await loadSampleDataset(sampleId)
  data.setData({
    headers: parsed.headers,
    rows: parsed.rows,
    sourcePath: parsed.fileName,
    embedded: true
  })
  const tplFields = tpl.fields?.length ? tpl.fields : extractTemplateFields(tpl.components)
  project.updateFieldMap(autoMatchFieldMap(tplFields, data.fields, {}))
  project.markDirty()
  return { templateId, sampleId, rowCount: parsed.rows.length }
}
