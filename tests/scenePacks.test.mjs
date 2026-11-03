import { SCENE_PACKS, getScenePack } from '../src/utils/scenePacks.js'
import { findSampleIdForTemplate } from '../src/utils/samples.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(SCENE_PACKS.length >= 8, 'scene packs expanded')
for (const p of SCENE_PACKS) {
  assert(p.templateId && p.sampleId, `pack ${p.id} needs ids`)
  assert(findSampleIdForTemplate(p.templateId) === p.sampleId, `pack ${p.id} sample must list template`)
  assert(getScenePack(p.id), `getScenePack ${p.id}`)
}

console.log('scenePacks ok')
