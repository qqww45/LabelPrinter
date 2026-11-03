import {
  buildTemplatePreviewModel,
  getBuiltinTemplate,
  glyphForComponent,
  previewScaleForLabel
} from '../src/utils/templatePreview.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const tpl = getBuiltinTemplate('tpl_grocery_price')
assert(tpl, 'grocery template exists')
const model = buildTemplatePreviewModel(tpl, 140, 96)
assert(model.components.length > 0, 'preview has components')
assert(model.widthPx > 20 && model.heightPx > 10, 'preview dimensions')
assert(model.surfaceStyle.background.includes('#'), 'label surface')

const scale = previewScaleForLabel(tpl.label, 100, 80)
assert(scale > 0, 'scale positive')
assert(glyphForComponent(tpl.components[0]).length > 0, 'glyph')

console.log('templatePreview.test.mjs: 5 passed')
