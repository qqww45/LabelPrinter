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

const pdfLines = pdfTextItemsToOcrLines(
  [{ str: 'Hello', transform: [12, 0, 0, 12, 40, 100] }],
  200,
  1
)
assert(pdfLines.length === 1 && pdfLines[0].text === 'Hello', 'pdf text items')

console.log('labelImportCore.test.mjs ok')