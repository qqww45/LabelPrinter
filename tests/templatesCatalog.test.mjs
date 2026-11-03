import {
  filterTemplateCatalog,
  getTemplateCatalog,
  templateSizeKey
} from '../src/utils/templatesCatalog.js'
import { BUILTIN_TEMPLATES } from '../src/utils/templates.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const catalog = getTemplateCatalog()
assert(catalog.length === BUILTIN_TEMPLATES.length, 'catalog covers builtins')
assert(catalog.every((c) => c.sampleId), 'each entry has sample')

const retail = filterTemplateCatalog(catalog, { scene: 'retail-price' })
assert(retail.length >= 3, 'retail scene filter')

const sized = filterTemplateCatalog(catalog, { size: '60x40' })
assert(sized.some((c) => c.templateId === 'tpl_price_tag'), 'size filter 60x40')

const tpl = BUILTIN_TEMPLATES[0]
assert(templateSizeKey(tpl).includes('x'), 'size key format')

console.log('templatesCatalog.test.mjs: 5 passed')
