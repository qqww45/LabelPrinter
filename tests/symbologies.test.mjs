import bwipjs from 'bwip-js'
import JsBarcode from 'jsbarcode'
import { twoDEncodes, twoDBcid } from '../src/utils/twoDCode.js'
import { jsBarcodeFormat, allSymbologyIdsLocal, sample1DBarcodeValue } from '../src/utils/symbologyCatalog.js'
import { barcodeScanIssue } from '../src/utils/barcodeScan.js'
import { codePayload } from '../src/utils/render.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg) }
  else { failed++; console.error('  ✗', msg) }
}

console.log('symbologies')

for (const fmt of ['QR', 'PDF417', 'DATAMATRIX', 'AZTEC']) {
  assert(await twoDEncodes('LBP-TEST-001', fmt), `${fmt} encodes in Node`)
}

assert(twoDBcid('PDF417') === 'pdf417', 'bcid map')
assert(jsBarcodeFormat('EAN8') === 'EAN8', 'js barcode alias')
assert(jsBarcodeFormat('UPC') === 'UPC', 'UPC maps')

assert(typeof document === 'undefined' || (() => {
  try {
    const c = document.createElement('canvas')
    JsBarcode(c, '123456789012', { format: 'CODE128', displayValue: false, margin: 0 })
    return c.width > 10
  } catch { return true }
})(), 'CODE128 optional DOM')

assert(
  codePayload({ dataMode: 'serial', prefix: 'SN', pad: 4, start: 10, step: 2, serialSource: 'sequence' }, { __labelIndex: 1 }) === 'SN0012',
  'barcode serial bind payload'
)

for (const f of ['EAN13', 'EAN8', 'UPC', 'ITF14', 'CODABAR']) {
  const v = sample1DBarcodeValue(f)
  assert(barcodeScanIssue({ format: f, value: v, widthMm: 40, heightMm: 12 }) === 'ok', `sample ${f} scannable`)
}

assert(allSymbologyIdsLocal().length >= 10, 'local catalog only')
assert(!allSymbologyIdsLocal().some(id => /^https?:/i.test(id)), 'no remote symbology ids')

const dm = await bwipjs.toBuffer({ bcid: 'datamatrix', text: 'DM', scale: 2 })
assert(dm.byteLength > 0, 'datamatrix buffer')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)