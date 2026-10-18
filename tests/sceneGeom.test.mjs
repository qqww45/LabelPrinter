import assert from 'node:assert/strict'
import { ActiveSelection, Rect } from 'fabric'
import { readSceneGeometry } from '../src/utils/sceneGeom.js'

function rect(left, top, width, height) {
  return new Rect({
    left, top, width, height,
    originX: 'left',
    originY: 'top',
    strokeWidth: 0,
    fill: '#000'
  })
}

const a = rect(10, 20, 40, 20)
const b = rect(80, 30, 30, 30)
const sel = new ActiveSelection([a, b])
sel.set({ left: sel.left + 15, top: sel.top + 8 })
sel.setCoords()

const movedA = readSceneGeometry(a)
const movedB = readSceneGeometry(b)
assert.equal(movedA.left, 25, '平移后用画布坐标，不用相对选区的 left')
assert.equal(movedA.top, 28)
assert.notEqual(a.left, movedA.left)
assert.equal(movedB.left, 95)
assert.equal(movedB.top, 38)
assert.equal(movedA.width, 40)
assert.equal(movedB.height, 30)

sel.set({ scaleX: 2, scaleY: 2 })
sel.setCoords()
const scaledA = readSceneGeometry(a)
const scaledB = readSceneGeometry(b)
assert.equal(scaledA.width, 80, '整组放大要算进每个控件的宽')
assert.equal(scaledA.height, 40)
assert.equal(scaledB.width, 60)
assert.equal(scaledB.height, 60)
assert.ok(Math.abs(scaledA.left - a.left) > 1, '放大后不能把相对坐标当成画布位置')
assert.equal(scaledA.inGroup, true)
assert.equal(scaledA.scaleY, 2)

const alone = rect(4, 6, 10, 8)
alone.scaleX = 1.5
alone.scaleY = 2
const single = readSceneGeometry(alone)
assert.equal(single.left, 4)
assert.equal(single.top, 6)
assert.equal(single.width, 15)
assert.equal(single.height, 16)
assert.equal(single.inGroup, false)

console.log('sceneGeom ok')
