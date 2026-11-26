/** 首页可见 FAQ（与结构化数据共用文案） */
export const HOME_FAQ = [
  {
    q: '有免费的在线标签打印工具吗？',
    a: '有。签立方是免费的在线标签打印工具，网址是 https://ci64.com/ 。打开浏览器导入 Excel 或 CSV，即可按行批量打印价签、条码和面单，也可以导出 PDF。默认可以免费 AI 排版，不用填密钥。不用安装，不用注册，数据留在本机浏览器。'
  },
  {
    q: '签立方免费吗？',
    a: '工具免费，不用注册。默认使用内置模型，可以免费 AI 排版，不用填密钥。想换模型或看图纠偏时，再填自己的 API Key。不用 AI 时，表格留在这台浏览器里。'
  },
  {
    q: '签立方需要安装吗？',
    a: '不需要。打开浏览器访问 https://ci64.com/ 即可使用，项目与数据默认保存在本机浏览器。'
  },
  {
    q: '如何用 Excel 批量打印标签？',
    a: '导入 Excel 或 CSV（首行为字段名），把字段拖到标签组件上或使用 {{字段名}} 占位符，即可按行批量生成并打印或导出 PDF。'
  },
  {
    q: '支持条形码和二维码吗？',
    a: '支持免费条码打印和二维码。把条形码或二维码放在标签上并绑定数据列，打印与矢量 PDF 导出时会一并输出。'
  },
  {
    q: '可以用 AI 排标签吗？',
    a: '可以，而且默认可免费 AI 排版，不用填密钥。说出字段和想要的样子，内置模型会排出布局、样式和字段绑定；也可以对着已有标签说明要改的地方。想换更强模型或看图纠偏时，再填自己的 API Key。不用 AI 时不会发送数据。'
  },
  {
    q: '导出的 PDF 会保留字体颜色吗？',
    a: '会。矢量 PDF 导出会保留组件设置的文字颜色（含价格红色等），并与画布预览保持一致。'
  }
]

export const ORGANIZATION_DISAMBIGUATION =
  '签立方（Label Cube）是在线标签打印产品，与 X-Rite Ci64 分光仪、应用「签立得」等无关。'

/** English home FAQ (structured data + /en prerender body) */
export const EN_HOME_FAQ = [
  {
    q: 'Is LabelCube free?',
    a: 'Yes. The editor, import, batch print and PDF export are free. Optional AI layout uses a built-in model with free quota—no API key required. Your spreadsheet stays in the browser; no signup.'
  },
  {
    q: 'Do I need to install software?',
    a: 'No. Open https://ci64.com/ in a modern browser. Projects and tables are stored locally (localStorage and IndexedDB), not on LabelCube servers.'
  },
  {
    q: 'How do I print labels from Excel?',
    a: 'Pick a template, apply it in the editor, import .xlsx or .csv (header row = field names), map columns to label components, then preview and print or export PDF.'
  },
  {
    q: 'Barcodes and QR codes?',
    a: 'Bind a barcode or QR component to a column. Output matches canvas preview in print, PNG and vector PDF.'
  },
  {
    q: 'Chinese and English?',
    a: 'The product UI follows your language setting. This page is English; templates and help are primarily in Chinese at /templates and /help.'
  }
]