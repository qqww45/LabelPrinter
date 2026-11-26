import { canonicalPathForRoute, canonicalUrlForRoute } from '../src/utils/siteCanonical.js'
import { OFFICIAL_SITE_ORIGIN } from '../src/utils/site.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(canonicalPathForRoute({ path: '/templates', query: { scene: 'retail-price' } }) === '/templates/retail-price')
assert(
  canonicalPathForRoute({ path: '/templates', query: { scene: 'jewelry' } }) === '/templates'
)
assert(
  canonicalUrlForRoute({ path: '/templates', query: { scene: 'retail-price', utm_source: 'x' } }) ===
    `${OFFICIAL_SITE_ORIGIN}/templates/retail-price`
)
assert(canonicalUrlForRoute({ path: '/templates', query: { scene: 'packing' } })?.endsWith('/templates'))

console.log('siteCanonical ok')