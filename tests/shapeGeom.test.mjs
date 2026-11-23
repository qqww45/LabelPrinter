import { arrowGeometryMm, polylinePointsMm, defaultPolylinePoints } from '../src/utils/shapeGeom.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const right = arrowGeometryMm({ width: 30, height: 12, arrowDirection: 'right' })
assert(right.shaft.length === 2 && right.head.length === 3, 'arrow geom')

const up = arrowGeometryMm({ arrowDirection: 'up', width: 20, height: 24 })
assert(up.shaft[0][1] > up.shaft[1][1], 'up arrow shaft')

const pts = polylinePointsMm({ width: 40, height: 20 })
assert(pts.length >= 4, 'default polyline points')
assert(defaultPolylinePoints(30, 12).length === 4, 'default helper')

console.log('shapeGeom.test.mjs ok')