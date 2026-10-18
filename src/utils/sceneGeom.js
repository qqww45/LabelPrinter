// 多选时 Fabric 把子对象的 left/top 改成相对选区中心。
// 写回项目必须用画布坐标，否则松手重画时没被拖动的控件会跟着挪。

export function readSceneGeometry(obj) {
  const inGroup = !!obj?.group
  const xy = inGroup ? obj.getXY() : { x: obj?.left || 0, y: obj?.top || 0 }
  const scaling = inGroup
    ? obj.getObjectScaling()
    : { x: obj?.scaleX || 1, y: obj?.scaleY || 1 }
  const angle = inGroup ? obj.getTotalAngle() : (obj?.angle || 0)
  const sx = Math.abs(Number(scaling.x) || 1)
  const sy = Math.abs(Number(scaling.y) || 1)
  return {
    left: xy.x,
    top: xy.y,
    width: (obj?.width || 0) * sx,
    height: (obj?.height || 0) * sy,
    angle: angle || 0,
    scaleY: sy,
    inGroup
  }
}
