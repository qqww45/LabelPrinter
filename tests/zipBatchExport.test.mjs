import {
  labelBatchFilenames,
  buildZipBlob,
  assertDistinctPerLabelZipEntries,
  buildPerLabelZipEntries
} from '../src/utils/zipBatchExport.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(labelBatchFilenames('demo', 1, 'pdf')[0] === 'demo.pdf', 'single name')
assert(labelBatchFilenames('demo', 3, 'png').length === 3, 'three names')

const blob = await buildZipBlob([
  { name: 'a.txt', data: new Uint8Array([65]) },
  { name: 'b.txt', data: new Uint8Array([66]) }
])
assert(blob && blob.size > 10, 'zip blob size')

const perLabel = [
  { name: 'a.pdf', data: new Uint8Array([1, 2, 3]) },
  { name: 'b.pdf', data: new Uint8Array([4, 5, 6]) }
]
assert(assertDistinctPerLabelZipEntries(perLabel), 'distinct ok')
let threw = false
try {
  assertDistinctPerLabelZipEntries([
    { name: 'a.pdf', data: new Uint8Array([9, 9]) },
    { name: 'b.pdf', data: new Uint8Array([9, 9]) }
  ])
} catch {
  threw = true
}
assert(threw, 'rejects identical per-label bytes')

const mockBuild = async ({ labels }) => {
  const tag = labels.map((l) => l.row?.sku || l.row?.name || 'x').join('|')
  const enc = new TextEncoder().encode(`pdf:${tag}`)
  return new Blob([enc])
}

const entries = await buildPerLabelZipEntries({
  project: { meta: { name: 'demo' } },
  labels: [{ row: { sku: 'A' } }, { row: { sku: 'B' } }],
  buildPdfBlob: mockBuild
})
assert(entries.length === 3, 'two per-label + batch')
assert(entries[0].name.endsWith('.pdf'), 'per-label name')
assert(entries[2].name === 'demo-batch.pdf', 'batch name')

const ab0 = new Uint8Array(await entries[0].data.arrayBuffer())
const ab1 = new Uint8Array(await entries[1].data.arrayBuffer())
assert(ab0[4] !== ab1[4], 'per-label pdf bytes differ')

console.log('zipBatchExport.test.mjs ok')