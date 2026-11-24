import {
  TEMPLATE_SCENE_SLUGS,
  parseTemplateSceneSlug,
  renderTemplateSceneBodyHtml,
  siteMetaForTemplateScene
} from '../src/content/templateSceneSeo.js'
import { ROUTE_SITE_META } from '../src/utils/siteMeta.js'
import { SITEMAP_PATHS, SITEMAP_ENTRIES, getSeoRoutePayload } from '../src/content/seoStatic.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(TEMPLATE_SCENE_SLUGS.length === 6, 'six scene slugs')

for (const slug of TEMPLATE_SCENE_SLUGS) {
  const path = `/templates/${slug}`
  assert(parseTemplateSceneSlug(path) === slug, `parse ${slug}`)
  assert(parseTemplateSceneSlug(`/templates/${slug}/extra`) === null, 'no nested')
  assert(ROUTE_SITE_META[path], `meta ${path}`)
  assert(SITEMAP_PATHS.includes(path), `sitemap ${path}`)
  assert(SITEMAP_ENTRIES[path], `sitemap entry ${path}`)

  const html = renderTemplateSceneBodyHtml(slug)
  assert(html.includes('<h1'), `${slug} h1`)
  assert(html.includes('seo-breadcrumb'), `${slug} breadcrumb`)
  assert(html.includes('本场景内置模板'), `${slug} template list`)

  const meta = siteMetaForTemplateScene(slug)
  assert(meta.title.length > 10, `${slug} title`)
  assert(meta.description.length > 40, `${slug} description`)

  const payload = getSeoRoutePayload(path)
  assert(payload?.jsonLd?.length >= 1, `${slug} jsonLd`)
}

assert(parseTemplateSceneSlug('/templates/not-a-scene') === null, 'unknown slug')
assert(parseTemplateSceneSlug('/templates/jewelry') === null, 'jewelry is not a landing')

console.log('templateSceneSeo ok')