import {
  ROUTE_SITE_META,
  OG_IMAGE_URL,
  canonicalUrlForPath,
  siteMetaForPath
} from '../src/utils/siteMeta.js'
import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL } from '../src/utils/site.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(OG_IMAGE_URL === `${OFFICIAL_SITE_ORIGIN}/marketing/hero-app-editor.webp`, 'OG image URL')

for (const path of ['/', '/templates', '/help', '/app']) {
  assert(siteMetaForPath(path), `meta for ${path}`)
}

assert(canonicalUrlForPath('/') === OFFICIAL_SITE_URL, 'home canonical trailing slash')
assert(canonicalUrlForPath('/templates') === `${OFFICIAL_SITE_ORIGIN}/templates`, 'templates canonical')
assert(canonicalUrlForPath('/help') === `${OFFICIAL_SITE_ORIGIN}/help`, 'help canonical')
assert(canonicalUrlForPath('/app') === `${OFFICIAL_SITE_ORIGIN}/app`, 'app canonical')

assert(ROUTE_SITE_META['/app'].robots === 'noindex,follow', '/app must be noindex')
assert(ROUTE_SITE_META['/'].robots === 'index,follow', 'home indexable')

assert(ROUTE_SITE_META['/templates'].title.includes('模板库'), 'templates title')
assert(ROUTE_SITE_META['/help'].title.includes('帮助'), 'help title')

console.log('siteMeta ok')
