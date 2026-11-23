import { labelBatchFilenames, buildZipBlob } from '../src/utils/zipBatchExport.js'

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

console.log('zipBatchExport.test.mjs ok')