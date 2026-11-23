import { ICON_LIBRARY, assetLibraryIsFullyLocal, iconToDataUrl } from '../src/utils/assetLibrary.js'
import { TEXT_SNIPPETS, snippetById } from '../src/utils/textSnippets.js'
import { isPdfEmbeddableImageSrc, isSvgDataUrl } from '../src/utils/rasterImage.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg) }
  else { failed++; console.error('  ✗', msg) }
}

console.log('assetLibrary')

assert(ICON_LIBRARY.length >= 8, 'curated icon count')
assert(assetLibraryIsFullyLocal(), 'icons fully local')
assert(iconToDataUrl('ce').startsWith('data:image/svg+xml'), 'svg data url for panel preview')
assert(isSvgDataUrl(iconToDataUrl('ce')), 'preview is svg')
assert(!isPdfEmbeddableImageSrc(iconToDataUrl('ce')), 'svg not pdf-embeddable')
assert(isPdfEmbeddableImageSrc('data:image/png;base64,iVBORw0KGgo='), 'png embeddable')

const sn = snippetById('eu_importer')
assert(sn && !/SHEIN|TEMU/i.test(sn.text), 'no competitor brand names')
assert(TEXT_SNIPPETS.length >= 5, 'snippets present')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)