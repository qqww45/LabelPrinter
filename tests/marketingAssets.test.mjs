import assert from 'node:assert/strict'
import {
  resolveMarketingAsset,
  HERO,
  SCENES,
  STEPS,
  HELP_BAND,
  TEMPLATE_COVERS
} from '../src/content/marketingAssets.js'

assert.ok(HERO.src.includes('/marketing/'))
assert.ok(HERO.src.endsWith('hero-shelf-price.webp'))
assert.ok(resolveMarketingAsset('scene', 'express').src.includes('marketing'))
assert.ok(resolveMarketingAsset('scene', 'express').src.includes('scene-express'))
assert.ok(resolveMarketingAsset('template', 'missing_id').src)
assert.ok(resolveMarketingAsset('template', 'tpl_express').src.includes('scene-express'))
assert.ok(Object.keys(SCENES).length >= 4)
assert.ok(STEPS[1]?.src.includes('step-pick'))
assert.ok(HELP_BAND.src.includes('help-band'))
assert.ok(TEMPLATE_COVERS.tpl_grocery_price)

console.log('marketingAssets.test.mjs OK')
