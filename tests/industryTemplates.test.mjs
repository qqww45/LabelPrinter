import {
  INDUSTRY_CATEGORIES,
  templatesForIndustry,
  featuredIndustryTemplates,
  filterCatalogByIndustry
} from '../src/utils/industryTemplates.js'
import { getTemplateCatalog } from '../src/utils/templatesCatalog.js'
import { BUILTIN_TEMPLATES } from '../src/utils/templates.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(INDUSTRY_CATEGORIES.length >= 5, 'five industry groups')
for (const cat of INDUSTRY_CATEGORIES) {
  const list = templatesForIndustry(cat.id)
  assert(list.length >= 1, `${cat.id} has templates`)
  assert(list.every((t) => BUILTIN_TEMPLATES.some((b) => b.id === t.id)), `${cat.id} ids valid`)
}

const featured = featuredIndustryTemplates()
assert(featured.length === INDUSTRY_CATEGORIES.length, 'featured one per category')

const catalog = getTemplateCatalog()
const priceOnly = filterCatalogByIndustry(catalog, 'price')
assert(priceOnly.length >= 2, 'price industry filters catalog')
assert(priceOnly.every((e) => templatesForIndustry('price').some((t) => t.id === e.templateId)), 'price filter ids')

console.log('industryTemplates.test.mjs ok')