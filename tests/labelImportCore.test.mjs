import {
  groupOcrLines,
  layoutLinesToComponents,
  looksLikeBarcode,
  pdfTextItemsToOcrLines,
  resetLabelImportIds
} from '../src/utils/labelImportCore.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(readFileSync(join(__dir, 'fixtures/label-import-ocr.json'), 'utf8'))

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(looksLikeBarcode('6901234567890'), 'barcode heuristic')
assert(!looksLikeBarcode('hello'), 'not barcode')

const grouped = groupOcrLines(fixture.lines)
assert(grouped.length >= 2, 'groups lines')

resetLabelImportIds(0)
const layout = layoutLinesToComponents(grouped, { width: 60, height: 40 }, { scalePxPerMm: fixture.scalePxPerMm })
assert(layout.components.length >= 3, 'components from fixture')
assert(layout.components.some((c) => c.type === 'text'), 'has text')
assert(layout.components.some((c) => c.type === 'barcode'), 'has barcode from fixture')

resetLabelImportIds(0)
const barcodeOnly = layoutLinesToComponents(
  [{ text: '6901234567890', x: 10, y: 40, w: 120, h: 20, fontSize: 10 }],
  { width: 60, height: 40 },
  { scalePxPerMm: 4 }
)
const bc = barcodeOnly.components.find((c) => c.type === 'barcode')
assert(bc && bc.text === '6901234567890', 'barcode text is recognized digits')
assert(bc.dataMode === 'fixed', 'barcode fixed mode')

const pdfLines = pdfTextItemsToOcrLines(
  [{ str: 'Hello', transform: [12, 0, 0, 12, 40, 100] }],
  200,
  1
)
assert(pdfLines.length === 1 && pdfLines[0].text === 'Hello', 'pdf text items')

console.log('labelImportCore.test.mjs ok')