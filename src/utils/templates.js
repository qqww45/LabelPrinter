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

const rect = (id, name, { left, top, width, height, fill = '#2563eb', stroke = '', strokeWidth = 0, rx = 0 }) => ({
  id, type: 'rect', name, left, top, width, height, angle: 0,
  fill, stroke, strokeWidth, rx, binding: ''
})

const line = (id, name, { left, top, width, stroke = '#cbd5e1', strokeWidth = 0.2, angle = 0 }) => ({
  id, type: 'line', name, left, top, width, height: 0.2, angle,
  stroke, strokeWidth, binding: ''
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
      text('tpl_price_tag-c1', '商品名', { left: 4, top: 3, width: 52, height: 8, text: '{{产品名称}}', fontSize: 12, fontWeight: 'bold' }),
      text('tpl_price_tag-c2', '规格', { left: 4, top: 11, width: 52, height: 5, text: '{{规格}}', fontSize: 8, fill: '#64748b' }),
      text('tpl_price_tag-c3', '价格', { left: 4, top: 17, width: 52, height: 12, text: '¥{{价格}}', fontSize: 22, fontWeight: 'bold', fill: '#d0021b' }),
      barcode('tpl_price_tag-c4', '条码', { left: 4, top: 30, width: 52, height: 9, binding: '条码' })
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
      rect('tpl_express-r1', '标题栏', { left: 0, top: 0, width: 100, height: 10, fill: '#2563eb' }),
      text('tpl_express-h1', '标题', { left: 4, top: 2.5, width: 92, height: 5, text: '快递面单', fontSize: 11, fontWeight: 'bold', fill: '#ffffff', textAlign: 'center' }),
      text('tpl_express-c1', '收件人', { left: 5, top: 13, width: 90, height: 7, text: '{{收件人}}', fontSize: 14, fontWeight: 'bold' }),
      text('tpl_express-c2', '电话', { left: 5, top: 21, width: 90, height: 5, text: '电话 {{电话}}', fontSize: 9, fill: '#475569' }),
      text('tpl_express-c3', '地址', { left: 5, top: 27, width: 90, height: 12, text: '{{地址}}', fontSize: 9, fill: '#334155' }),
      table('tpl_express-c4', '明细', {
        left: 5, top: 42, width: 90, height: 36, rows: 3, cols: 3, fontSize: 8,
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
      qrcode('tpl_express-c5', '面单二维码', { left: 5, top: 82, width: 26, height: 26, binding: '单号' }),
      text('tpl_express-c6', '单号', { left: 34, top: 84, width: 61, height: 6, text: '运单 {{单号}}', fontSize: 9, fontWeight: 'bold' }),
      text('tpl_express-c7', '备注', { left: 34, top: 92, width: 61, height: 12, text: '签收：________', fontSize: 8, fill: '#64748b' })
    ]
  },
  {
    id: 'tpl_grocery_price',
    name: '超市价签 70×40',
    group: '零售',
    desc: '品名 + 规格 + 大红单价/单位 + 条码，超市货架常用',
    fields: ['品名', '规格', '单价', '单位', '条码'],
    paper: labelPaper(70, 40),
    label: { width: 70, height: 40, backgroundColor: '#ffffff', showBorder: false, borderColor: '#000000', borderWidth: 0.3 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      rect('tpl_grocery_price-r1', '顶栏', { left: 0, top: 0, width: 70, height: 7, fill: '#2563eb' }),
      text('tpl_grocery_price-h1', '顶栏字', { left: 3, top: 1.5, width: 64, height: 4, text: '生鲜价签', fontSize: 7, fontWeight: 'bold', fill: '#ffffff' }),
      text('tpl_grocery_price-c1', '品名', { left: 4, top: 9, width: 62, height: 7, text: '{{品名}}', fontSize: 11, fontWeight: 'bold' }),
      text('tpl_grocery_price-c2', '规格', { left: 4, top: 16, width: 62, height: 4.5, text: '{{规格}}', fontSize: 7.5, fill: '#64748b' }),
      text('tpl_grocery_price-c3', '单价', { left: 4, top: 21, width: 40, height: 11, text: '¥{{单价}}', fontSize: 22, fontWeight: 'bold', fill: '#d0021b' }),
      text('tpl_grocery_price-c4', '单位', { left: 44, top: 26, width: 22, height: 4, text: '/{{单位}}', fontSize: 8, fill: '#94a3b8' }),
      barcode('tpl_grocery_price-c5', '条码', { left: 4, top: 30, width: 62, height: 9, binding: '条码' })
    ]
  },
  {
    id: 'tpl_retail_shelf_70',
    name: '货架价签 70×40（分栏）',
    group: '零售',
    desc: '蓝顶栏 · 左侧品名与条码 · 右侧大字价格/净重/保质期（超市货架）',
    fields: ['品名', '规格', '单价', '单位', '价格', '条码', '净重', '保质期', '货位', '产地'],
    paper: labelPaper(70, 40),
    label: { width: 70, height: 40, backgroundColor: '#ffffff', showBorder: false, borderColor: '#000000', borderWidth: 0.3 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      rect('tpl_retail_shelf_70-r1', '顶栏', { left: 0, top: 0, width: 70, height: 7.5, fill: '#2563eb' }),
      text('tpl_retail_shelf_70-h1', '顶栏左', { left: 2.5, top: 0.8, width: 28, height: 3.5, text: '生鲜专柜', fontSize: 7, fontWeight: 'bold', fill: '#ffffff' }),
      text('tpl_retail_shelf_70-h2', '顶栏右', {
        left: 30, top: 0.9, width: 37.5, height: 3.5, text: '单价 ¥{{单价}}/{{单位}}', fontSize: 6.5, fill: '#ffffff', textAlign: 'right'
      }),
      line('tpl_retail_shelf_70-v1', '分栏线', { left: 45.2, top: 7.8, width: 24, stroke: '#cbd5e1', strokeWidth: 0.25, angle: 90 }),
      text('tpl_retail_shelf_70-c1', '品名', { left: 2.5, top: 8.5, width: 41, height: 7, text: '{{品名}}', fontSize: 10.5, fontWeight: 'bold', fill: '#0f172a' }),
      text('tpl_retail_shelf_70-c2', '规格', { left: 2.5, top: 15.5, width: 41, height: 4, text: '{{规格}}', fontSize: 7, fill: '#64748b' }),
      text('tpl_retail_shelf_70-c3', '产地', { left: 2.5, top: 20, width: 41, height: 3.5, text: '产地：{{产地}}', fontSize: 6.5, fill: '#475569' }),
      barcode('tpl_retail_shelf_70-c4', '条码', { left: 2.5, top: 28, width: 41, height: 9, binding: '条码' }),
      text('tpl_retail_shelf_70-c5', '价格', {
        left: 46, top: 8.5, width: 23, height: 12, text: '¥{{价格}}', fontSize: 19, fontWeight: 'bold', fill: '#2563eb', textAlign: 'center'
      }),
      line('tpl_retail_shelf_70-hr', '价区分隔', { left: 47, top: 23.5, width: 21, stroke: '#e2e8f0', strokeWidth: 0.2 }),
      text('tpl_retail_shelf_70-c6', '净重', { left: 46, top: 25.5, width: 23, height: 4, text: '净重 {{净重}}', fontSize: 6.5, fill: '#334155', textAlign: 'center' }),
      text('tpl_retail_shelf_70-c7', '保质期', { left: 46, top: 30, width: 23, height: 4, text: '保质 {{保质期}}', fontSize: 6.5, fill: '#334155', textAlign: 'center' }),
      text('tpl_retail_shelf_70-c8', '货位', { left: 46, top: 34.5, width: 23, height: 3.5, text: '货位 {{货位}}', fontSize: 6, fill: '#94a3b8', textAlign: 'center' })
    ]
  },
  {
    id: 'tpl_jewelry',
    name: '珠宝签 50×20',
    group: '零售',
    desc: '细长小字：品名、克重、工费、条码',
    fields: ['品名', '克重', '工费', '条码'],
    paper: labelPaper(50, 20),
    label: { width: 50, height: 20, backgroundColor: '#ffffff', showBorder: false, borderColor: '#000000', borderWidth: 0.2 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      rect('tpl_jewelry-r1', '顶条', { left: 0, top: 0, width: 50, height: 3.5, fill: '#1e293b' }),
      text('tpl_jewelry-c1', '品名', { left: 2, top: 4.5, width: 28, height: 4.5, text: '{{品名}}', fontSize: 7.5, fontWeight: 'bold' }),
      text('tpl_jewelry-c2', '克重', { left: 2, top: 9, width: 28, height: 3.5, text: '{{克重}} g', fontSize: 6.5, fill: '#475569' }),
      text('tpl_jewelry-c3', '工费', { left: 2, top: 12.5, width: 28, height: 3.5, text: '工费 ¥{{工费}}', fontSize: 6.5, fill: '#d0021b', fontWeight: 'bold' }),
      barcode('tpl_jewelry-c4', '条码', { left: 31, top: 3, width: 17, height: 15, binding: '条码' })
    ]
  },
  {
    id: 'tpl_apparel_hang',
    name: '服装吊牌 40×60',
    group: '零售',
    desc: '竖版吊牌：款号、尺码、颜色、吊牌价、条码',
    fields: ['款号', '尺码', '颜色', '吊牌价', '条码'],
    paper: labelPaper(40, 60),
    label: { width: 40, height: 60, backgroundColor: '#ffffff', showBorder: true, borderColor: '#94a3b8', borderWidth: 0.3 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      rect('tpl_apparel_hang-r1', '品牌条', { left: 0, top: 0, width: 40, height: 8, fill: '#2563eb' }),
      text('tpl_apparel_hang-h1', '品牌', { left: 3, top: 2, width: 34, height: 4, text: '吊牌价', fontSize: 7, fill: '#ffffff', textAlign: 'center', fontWeight: 'bold' }),
      text('tpl_apparel_hang-c1', '款号', { left: 3, top: 10, width: 34, height: 6, text: '{{款号}}', fontSize: 10, fontWeight: 'bold', textAlign: 'center' }),
      text('tpl_apparel_hang-c2', '尺码', { left: 3, top: 17, width: 34, height: 5, text: '尺码 {{尺码}}', fontSize: 8.5, textAlign: 'center' }),
      text('tpl_apparel_hang-c3', '颜色', { left: 3, top: 22, width: 34, height: 5, text: '{{颜色}}', fontSize: 8.5, textAlign: 'center', fill: '#64748b' }),
      text('tpl_apparel_hang-c4', '吊牌价', { left: 3, top: 29, width: 34, height: 9, text: '¥{{吊牌价}}', fontSize: 17, fontWeight: 'bold', fill: '#d0021b', textAlign: 'center' }),
      barcode('tpl_apparel_hang-c5', '条码', { left: 5, top: 40, width: 30, height: 16, binding: '条码' })
    ]
  },
  {
    id: 'tpl_shelf_strip',
    name: '货架条 100×30',
    group: '批量',
    desc: '宽条货架签：品名、货位、大红价格',
    fields: ['品名', '货位', '价格'],
    paper: labelPaper(100, 30),
    label: { width: 100, height: 30, backgroundColor: '#ffffff', showBorder: true, borderColor: '#cbd5e1', borderWidth: 0.2 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      text('tpl_shelf_strip-c1', '品名', { left: 3, top: 3, width: 62, height: 8, text: '{{品名}}', fontSize: 13, fontWeight: 'bold' }),
      text('tpl_shelf_strip-c2', '货位', { left: 3, top: 13, width: 62, height: 5, text: '货位 {{货位}}', fontSize: 8, fill: '#64748b' }),
      text('tpl_shelf_strip-c3', '价格', { left: 66, top: 4, width: 31, height: 22, text: '¥{{价格}}', fontSize: 20, fontWeight: 'bold', fill: '#d0021b', textAlign: 'center' })
    ]
  },
  {
    id: 'tpl_asset_fixed',
    name: '固定资产 60×40',
    group: '资产',
    desc: '资产编号二维码 + 名称、部门、保管人',
    fields: ['资产编号', '名称', '部门', '保管人'],
    paper: labelPaper(60, 40),
    label: { width: 60, height: 40, backgroundColor: '#ffffff', showBorder: true, borderColor: '#94a3b8', borderWidth: 0.3 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      rect('tpl_asset_fixed-r1', '顶栏', { left: 0, top: 0, width: 60, height: 6, fill: '#0f172a' }),
      text('tpl_asset_fixed-h1', '顶栏字', { left: 2, top: 1.2, width: 56, height: 3.5, text: '固定资产', fontSize: 7, fill: '#ffffff', textAlign: 'center', fontWeight: 'bold' }),
      qrcode('tpl_asset_fixed-c1', '二维码', { left: 3, top: 8, width: 18, height: 18, binding: '资产编号' }),
      text('tpl_asset_fixed-c2', '资产编号', { left: 23, top: 8, width: 34, height: 5, text: '{{资产编号}}', fontSize: 8, fontWeight: 'bold' }),
      text('tpl_asset_fixed-c3', '名称', { left: 23, top: 14, width: 34, height: 6, text: '{{名称}}', fontSize: 9.5, fontWeight: 'bold' }),
      text('tpl_asset_fixed-c4', '部门', { left: 23, top: 21, width: 34, height: 4.5, text: '{{部门}}', fontSize: 7.5, fill: '#64748b' }),
      text('tpl_asset_fixed-c5', '保管人', { left: 23, top: 26, width: 34, height: 4.5, text: '保管 {{保管人}}', fontSize: 7.5, fill: '#64748b' }),
      rect('tpl_asset_fixed-r2', '底条', { left: 0, top: 34, width: 60, height: 6, fill: '#f1f5f9' })
    ]
  },
  {
    id: 'tpl_warehouse_bin',
    name: '库位签 80×50',
    group: '仓储',
    desc: '大号库位二维码 + SKU、品名',
    fields: ['库位', 'SKU', '品名'],
    paper: labelPaper(80, 50),
    label: { width: 80, height: 50, backgroundColor: '#ffffff', showBorder: true, borderColor: '#64748b', borderWidth: 0.4 },
    margin: zeroMargin,
    layout: { ...singleLayout },
    components: [
      rect('tpl_warehouse_bin-r1', '侧条', { left: 0, top: 0, width: 4, height: 50, fill: '#2563eb' }),
      qrcode('tpl_warehouse_bin-c1', '库位码', { left: 7, top: 8, width: 26, height: 26, binding: '库位' }),
      text('tpl_warehouse_bin-c2', '库位', { left: 36, top: 8, width: 40, height: 11, text: '{{库位}}', fontSize: 18, fontWeight: 'bold' }),
      text('tpl_warehouse_bin-c3', 'SKU', { left: 36, top: 21, width: 40, height: 6, text: 'SKU {{SKU}}', fontSize: 9, fill: '#475569' }),
      text('tpl_warehouse_bin-c4', '品名', { left: 36, top: 28, width: 40, height: 14, text: '{{品名}}', fontSize: 10, fill: '#334155' })
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
