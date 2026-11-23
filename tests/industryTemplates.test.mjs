import { INDUSTRY_CATEGORIES, templatesForIndustry, featuredIndustryTemplates } from '../src/utils/industryTemplates.js'
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

console.log('industryTemplates.test.mjs ok')