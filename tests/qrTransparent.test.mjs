import assert from 'node:assert/strict'

const fills = []
globalThis.document = {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error(`unexpected element: ${tag}`)
    const cv = { width: 0, height: 0 }
    cv.getContext = () => {
      let fillStyle = ''
      return {
        get fillStyle() { return fillStyle },
        set fillStyle(v) { fillStyle = v },
        fillRect(x, y, w, h) { fills.push({ color: fillStyle, x, y, w, h }) },
        clearRect() {}
      }
    }
    return cv
  }
}

const { codeImageOptions, isTransparentCodeBackground, qrToCanvas } = await import('../src/utils/cellImage.js')

assert.equal(isTransparentCodeBackground(codeImageOptions({ transparent: true })), true, '组件可开启透明背景')
assert.equal(isTransparentCodeBackground(codeImageOptions({ light: 'transparent' })), true, 'light 传 transparent 也视为透明')
assert.equal(isTransparentCodeBackground(codeImageOptions({})), false, '默认仍是不透明白底')

fills.length = 0
const plain = qrToCanvas('HELLO', 120)
assert.equal(fills[0].color, '#ffffff', '默认先铺白底')
assert.equal(fills[0].w, plain.width, '白底铺满整张画布')

fills.length = 0
const transparent = qrToCanvas('HELLO', 120, { transparent: true })
assert.equal(fills[0].color, '#000000', '透明时第一笔直接画码点，不再铺白底')
assert.ok(fills.every(f => f.color === '#000000'), '透明时画布上没有白色矩形')
assert.equal(transparent.width, plain.width, '透明与否不改变二维码尺寸')

fills.length = 0
qrToCanvas('HELLO', 120, { transparent: true, dark: '#123456' })
assert.ok(fills.every(f => f.color === '#123456'), '透明时仍支持自定义码点颜色')

console.log('qrTransparent ok')
