import {
  HOME_FEATURED_SCENE_IDS,
  TEMPLATE_SCENE_SLUGS,
  hasTemplateSceneLanding,
  parseTemplateSceneSlug,
  templateSceneRouteTarget
} from '../src/content/templateSceneSeo.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(!TEMPLATE_SCENE_SLUGS.includes('jewelry'), 'jewelry must not have a static landing slug')
assert(parseTemplateSceneSlug('/templates/jewelry') === null, '/templates/jewelry is not a landing path')
assert(!hasTemplateSceneLanding('jewelry'), 'jewelry has no landing')

for (const id of HOME_FEATURED_SCENE_IDS) {
  const target = templateSceneRouteTarget(id)
  assert(target.path, `target path for ${id}`)
  if (hasTemplateSceneLanding(id)) {
    assert(target.path === `/templates/${id}`, `${id} uses landing path`)
    assert(!target.query?.scene, `${id} landing must not use scene query`)
  } else {
    assert(target.path === '/templates', `${id} must use template library`)
    assert(target.query?.scene === id, `${id} must filter by scene query`)
  }
}

assert(
  HOME_FEATURED_SCENE_IDS.every(
    (id) => hasTemplateSceneLanding(id) || !parseTemplateSceneSlug(`/templates/${id}`)
  ),
  'every featured id: landing or invalid slug'
)

console.log('homeSceneLinks ok')