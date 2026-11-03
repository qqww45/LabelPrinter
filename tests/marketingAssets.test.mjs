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
assert.ok(HERO.src.endsWith('hero-laptop-editor.webp'))
assert.ok(resolveMarketingAsset('scene', 'express').src.includes('sample-waybill'))
assert.ok(resolveMarketingAsset('scene', 'asset').src.includes('sample-asset-tag'))
assert.ok(resolveMarketingAsset('template', 'missing_id').src)
assert.ok(resolveMarketingAsset('template', 'tpl_express').src.includes('sample-waybill'))
assert.ok(Object.keys(SCENES).length >= 4)
assert.ok(STEPS[1]?.src.includes('sample-price-tag'))
assert.ok(HELP_BAND.src.includes('hero-label-stickers'))
assert.ok(TEMPLATE_COVERS.tpl_grocery_price.src.includes('sample-price-tag'))

console.log('marketingAssets.test.mjs OK')
