/**
 * 内置模板库
 * 每个模板 = 版式快照（纸张 / 标签 / 排版 / 边距 / 组件）
 * 应用模板时只替换版式，数据源与字段映射保持当前项目的
 */

const FONT = 'Microsoft YaHei'

const text = (id, name, { left, top, width, height, text: t, fontSize = 10, fill = '#000', fontWeight = 'normal', textAlign = 'left', binding = '' }) => ({
  id, type: 'text', name, left, top, width, height, angle: 0,
  text: t, fontSize, fill, fontFamily: FONT, fontWeight, textAlign, binding
})

const barcode = (id, name, { left, top, width, height, binding = '', format = 'CODE128', text: t = '' }) => ({
  id, type: 'barcode', name, left, top, width, height, angle: 0,
  text: t, binding, format
})

const qrcode = (id, name, { left, top, width, height, binding = '', text: t = '' }) => ({
  id, type: 'qrcode', name, left, top, width, height, angle: 0,
  text: t, binding
})

const table = (id, name, { left, top, width, height, rows, cols, fontSize = 8, cells = {}, colWidths = [], cellPadding = 1 }) => ({
  id, type: 'table', name, left, top, width, height, angle: 0,
  rows, cols, cellPadding, borderColor: '#333', borderWidth: 0.2,
  fill: '#ffffff', fontSize, fontFamily: FONT, textAlign: 'left',
  headerRow: true, headerBg: '#f1f5f9', colWidths, cells
})

const singleLayout = { mode: 'single', sizingMode: 'manual', cols: 1, rows: 1, hGap: 2, vGap: 2 }
// 单张标签纸：标签 = 纸张，不能留边距（否则打印整体右下偏移、右/下边被裁）
const zeroMargin = { top: 0, right: 0, bottom: 0, left: 0 }
const labelPaper = (w, h) => ({ width: w, height: h, backgroundColor: '#ffffff' })

export const BUILTIN_TEMPLATES = [
  {
    id: 'tpl_price_tag',
    name: '价格标签 60×40',
    group: '零售',
    desc: '商品名 + 规格 + 大字价格 + 条码，适合单张标签纸',
    fields: ['产品名称', '规格', '价格', '条码'],
    paper: labelPaper(60, 40),
    label: { width: 60, height: 40, backgroundColor: '#ffffff', showBorder: false, borderColor: '#000000', borderWidth: 0.3 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      text('tpl_price_tag-c1', '商品名', { left: 3, top: 2, width: 54, height: 7, text: '{{产品名称}}', fontSize: 11, fontWeight: 'bold' }),
      text('tpl_price_tag-c2', '规格', { left: 3, top: 9, width: 54, height: 5, text: '{{规格}}', fontSize: 8, fill: '#64748b' }),
      text('tpl_price_tag-c3', '价格', { left: 3, top: 15, width: 54, height: 10, text: '¥{{价格}}', fontSize: 18, fontWeight: 'bold', fill: '#d0021b' }),
      barcode('tpl_price_tag-c4', '条码', { left: 3, top: 27, width: 54, height: 11, binding: '条码' })
    ]
  },
  {
    id: 'tpl_goods_sheet',
    name: '商品信息标签 80×50',
    group: '零售',
    desc: '标题 + 三行两列信息表（规格 / 产地 / 单价）',
    fields: ['产品名称', '规格', '产地', '价格'],
    paper: labelPaper(80, 50),
    label: { width: 80, height: 50, backgroundColor: '#ffffff', showBorder: true, borderColor: '#94a3b8', borderWidth: 0.3 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      text('tpl_goods_sheet-c1', '标题', { left: 3, top: 2, width: 74, height: 8, text: '{{产品名称}}', fontSize: 14, fontWeight: 'bold' }),
      table('tpl_goods_sheet-c2', '信息表', {
        left: 3, top: 11, width: 74, height: 36, rows: 3, cols: 2, fontSize: 9,
        colWidths: [30, 70],
        cells: {
          '0,0': { text: '规格', binding: '' },
          '0,1': { text: '{{规格}}', binding: '规格' },
          '1,0': { text: '产地', binding: '' },
          '1,1': { text: '{{产地}}', binding: '产地' },
          '2,0': { text: '单价', binding: '' },
          '2,1': { text: '¥{{价格}}', binding: '价格' }
        }
      })
    ]
  },
  {
    id: 'tpl_barcode_tag',
    name: '条码标签 50×30',
    group: '仓储',
    desc: '名称 + CODE128 条码 + 条码数字',
    fields: ['产品名称', '条码'],
    paper: labelPaper(50, 30),
    label: { width: 50, height: 30, backgroundColor: '#ffffff', showBorder: false, borderColor: '#000000', borderWidth: 0.3 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      text('tpl_barcode_tag-c1', '名称', { left: 2, top: 2, width: 46, height: 6, text: '{{产品名称}}', fontSize: 10 }),
      barcode('tpl_barcode_tag-c2', '条码', { left: 2, top: 9, width: 46, height: 14, binding: '条码' }),
      text('tpl_barcode_tag-c3', '条码号', { left: 2, top: 24, width: 46, height: 5, text: '{{条码}}', fontSize: 8, textAlign: 'center' })
    ]
  },
  {
    id: 'tpl_qr_tag',
    name: '二维码标签 40×30',
    group: '仓储',
    desc: '左侧二维码 + 右侧名称与价格',
    fields: ['条码', '产品名称', '价格'],
    paper: labelPaper(40, 30),
    label: { width: 40, height: 30, backgroundColor: '#ffffff', showBorder: false, borderColor: '#000000', borderWidth: 0.3 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      qrcode('tpl_qr_tag-c1', '二维码', { left: 2, top: 3, width: 20, height: 20, binding: '条码' }),
      text('tpl_qr_tag-c2', '名称', { left: 23, top: 5, width: 15, height: 8, text: '{{产品名称}}', fontSize: 9 }),
      text('tpl_qr_tag-c3', '价格', { left: 23, top: 15, width: 15, height: 8, text: '{{价格}}', fontSize: 12, fontWeight: 'bold', fill: '#d0021b' })
    ]
  },
  {
    id: 'tpl_shelf_a4',
    name: 'A4 货架价签（多列自动排版）',
    group: '批量',
    desc: 'A4 纸自动排满 50×30 标签，适合整页批量打印',
    fields: ['产品名称', '价格', '条码'],
    paper: { width: 210, height: 297, backgroundColor: '#ffffff' },
    label: { width: 50, height: 30, backgroundColor: '#ffffff', showBorder: true, borderColor: '#cbd5e1', borderWidth: 0.2 },
    margin: { top: 8, right: 8, bottom: 8, left: 8 },
    layout: { mode: 'auto', sizingMode: 'auto', cols: 1, rows: 1, hGap: 3, vGap: 3 },
    components: [
      text('tpl_shelf_a4-c1', '名称', { left: 2, top: 2, width: 46, height: 6, text: '{{产品名称}}', fontSize: 10 }),
      text('tpl_shelf_a4-c2', '价格', { left: 2, top: 8, width: 46, height: 11, text: '¥{{价格}}', fontSize: 17, fontWeight: 'bold', fill: '#d0021b' }),
      barcode('tpl_shelf_a4-c3', '条码', { left: 2, top: 20, width: 46, height: 9, binding: '条码' })
    ]
  },
  {
    id: 'tpl_express',
    name: '快递面单 100×150',
    group: '物流',
    desc: '收件人信息 + 品名明细表 + 面单号二维码',
    fields: ['收件人', '电话', '地址', '品名', '数量', '单号'],
    paper: labelPaper(100, 150),
    label: { width: 100, height: 150, backgroundColor: '#ffffff', showBorder: true, borderColor: '#000000', borderWidth: 0.4 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      text('tpl_express-c1', '收件人', { left: 4, top: 4, width: 92, height: 8, text: '收件人：{{收件人}}', fontSize: 13, fontWeight: 'bold' }),
      text('tpl_express-c2', '电话', { left: 4, top: 13, width: 92, height: 6, text: '电话：{{电话}}', fontSize: 10 }),
      text('tpl_express-c3', '地址', { left: 4, top: 20, width: 92, height: 14, text: '地址：{{地址}}', fontSize: 10 }),
      table('tpl_express-c4', '明细', {
        left: 4, top: 38, width: 92, height: 40, rows: 3, cols: 3, fontSize: 9,
        colWidths: [12, 58, 30],
        cells: {
          '0,0': { text: '序号', binding: '' },
          '0,1': { text: '品名', binding: '' },
          '0,2': { text: '数量', binding: '' },
          '1,0': { text: '1', binding: '' },
          '1,1': { text: '{{品名}}', binding: '品名' },
          '1,2': { text: '{{数量}}', binding: '数量' },
          '2,0': { text: '2', binding: '' },
          '2,1': { text: '', binding: '' },
          '2,2': { text: '', binding: '' }
        }
      }),
      qrcode('tpl_express-c5', '面单二维码', { left: 4, top: 84, width: 28, height: 28, binding: '单号' }),
      text('tpl_express-c6', '单号', { left: 36, top: 86, width: 60, height: 7, text: '单号：{{单号}}', fontSize: 10 }),
      text('tpl_express-c7', '备注', { left: 36, top: 96, width: 60, height: 14, text: '签收：____________', fontSize: 9, fill: '#64748b' })
    ]
  }
]

/** 从项目快照里抽取模板所需的版式信息 */
export function snapshotAsTemplate(project, name) {
  return {
    id: 'my_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    group: '我的模板',
    desc: `${project.label.width}×${project.label.height} mm · ${project.components.length} 个组件`,
    fields: [],
    custom: true,
    createdAt: Date.now(),
    paper: JSON.parse(JSON.stringify(project.paper)),
    label: JSON.parse(JSON.stringify(project.label)),
    margin: JSON.parse(JSON.stringify(project.margin)),
    layout: JSON.parse(JSON.stringify(project.layout)),
    components: JSON.parse(JSON.stringify(project.components))
  }
}
