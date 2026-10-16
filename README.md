# 标签打印工具 (Label Printer)

把表格里的每一行，印成一张可以贴出去的标签。价签、快递面单、资产贴都在浏览器里排，然后批量打印或导出 PDF。

Turn each row of a spreadsheet into a label you can stick on something. Lay out price tags, shipping labels, and asset tags in the browser, then batch-print them or export a PDF.

**在线使用 / Try it:** https://label.s.ci64.com

开源，不用安装。项目和表格留在这台浏览器里。AI 排版用你自己的密钥，支持 DeepSeek、智谱 GLM、通义千问、OpenAI、Ollama。不用 AI 时，表格不会发出去。

Open source, nothing to install. The project and the table stay in this browser. AI layout uses your own key: DeepSeek, Zhipu GLM, Qwen, OpenAI, or Ollama. Skip AI, and the table is not sent.

## 标签不好排

在 Word 里拉文本框做价签，纸张尺寸一改，字和框就歪了。条形码、二维码还要另找网站生成，截图贴回去，打出来经常糊。

这里按毫米设置纸张和边距，把文本、图片、表格、条形码、二维码拖到标签上。一页排几列几行、间距多少，改尺寸不用重画。

Word text boxes slip when the paper size changes. Barcodes made on another site and pasted back print soft and crooked. Here the sheet, the margins, and the gaps are in millimetres. Change the size without redrawing the label.

## 表格里的数据打不成标签

商品、快递单、资产编号都在表格里，几十上百行。一条条抄到标签上，改一个价格就得全部重来。

导入 Excel 或 CSV（`.xlsx` / `.xls` / `.csv`，首行是字段名），把「品名」「价格」「编号」拖到标签上。每一行生成一张标签。翻页核对后打印，或导出 PDF、图片。换一批数据，同一张样子还能再打。

Names, shipments, and asset IDs already sit in a spreadsheet. Copying them onto labels by hand means one price change starts the job over. Import the file, drop the name, price, or ID onto the label, and each row becomes one label. Swap the table and print the same design again.

## 让 AI 先排一张

把品名、价格、条码这些字段，加上想要的风格说出来。AI 排出布局、样式和字段绑定。标签已经在画布上时，可以说「价格改成红色大字」或「规格为空时不打印」，也可以附一张实拍照片让它照着改。

Name the fields and the look, such as a product name, a price, and a barcode. AI places the layout, the styling, and the field bindings. On a label already on the canvas, say "make the price large and red" or "hide the spec when it is empty." You can attach a photo of the printed label for it to match.

## 适合拿来做

- **价签、产品标签**：名称、规格、价格，配上条形码。Price tags: name, spec, price, and a barcode.
- **快递面单**：收件人、电话、地址，配上运单二维码。Shipping labels: recipient, phone, address, and a QR code.
- **资产标签、条码吊牌**：资产编号、部门，扫出来能对上台账。Asset tags: an ID and a department you can scan back to the ledger.
- **Excel 批量打印**：表格有多少行，就出多少张，一页可以排多张。One row, one label, and several labels on a sheet.

## 功能特性

### 标签设计
- **纸张配置**：任意纸张尺寸（mm）、页边距、横/纵向；内置 A4/A5/A6/Letter 及常见标签纸预设
- **自动排版**：单张 / 多列多行网格，可调行列间距，自动计算一页能排多少张
- **8 种组件**：文本、图片、表格、二维码、条形码、矩形、直线、日期
- **属性面板**：位置、尺寸、字体、颜色、边框、旋转、对齐等逐项调节
- **画布操作**：拖拽移动、缩放、多选、对齐分布、撤销/重做

### 数据绑定
- **Excel/CSV 导入**：`.xlsx` / `.xls` / `.csv`，首行作为字段名
- **字段拖拽绑定**：把数据字段拖到组件上，或双击组件选择绑定字段
- **占位符语法**：组件文本里写 `{{字段名}}`，打印时自动替换为每行数据
- **实时预览**：切换数据行即时预览不同记录的填充效果
- **追加/替换导入**：再次导入时可**追加**（按列名智能合并）或**替换**（清空重来），不会误删已编辑的数据

### 数据管理
- 数据**内嵌在项目 JSON 里**（自包含，方便分享和备份）
- 每个项目拥有**独立的数据副本**，切换项目不会串数据
- 数据面板支持：新增行/列、删除、重命名列、排序、筛选、单元格直接编辑

### 批量输出
- **直接打印**：浏览器打印（支持份数、页码范围）
- **导出 PDF**：多页拼版，矢量质量
- **导出图片**：PNG 高清位图（scale 3x）
- **打印前体检**：自动检查字段失效、超出纸张、空白条码等问题，提前发现翻车点
- **打印队列 / 历史记录**：批量任务排队打印，历史任务可一键重打

### 效率工具
- **模板库**：6 个内置模板 + 自定义保存的"我的模板"
- **打印前体检**：字段失效预警、越界提醒
- **AI 排版**：说出字段和风格，生成布局并绑定字段。也可对着现有标签逐项改，或附一张实拍照片让它照着改（需自备 API 密钥）
- **主题**：亮色 / 暗色
- **多语言**：简体中文 / English；首次打开按系统/浏览器语言自动选择，之后可在工具栏切换
- **自动保存**：项目自动存到浏览器本地，刷新不丢

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

启动后访问 http://localhost:5173

**环境要求**：Node.js >= 18（推荐 20+）、npm >= 9

---

## 使用流程

1. **新建/打开项目** → 顶部文件菜单
2. **配置纸张** → 顶部"纸张"按钮（预设尺寸或自定义 mm）
3. **添加组件** → 从左侧组件面板拖到画布
4. **绑定字段** → 把左侧"数据字段"拖到画布组件上，或双击组件选字段
5. **导入数据** → 底部数据面板"导入 Excel/CSV"（首行为字段名）
6. **预览** → 顶部"预览"按钮，可翻页查看每张标签
7. **打印/导出** → 预览界面内直接打印 / 导出 PDF / 导出图片

---

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Esc` | 取消选择 |
| `Ctrl/⌘ + A` | 全选组件 |
| `Ctrl/⌘ + Z` | 撤销 |
| `Ctrl/⌘ + Y` 或 `Ctrl/⌘ + Shift + Z` | 重做 |
| `Ctrl/⌘ + D` | 复制选中组件 |
| `Ctrl/⌘ + Shift + D` | 取消选择 |

---

## 项目文件格式（.json）

设计稿保存为单个 JSON 文件，**自带数据副本**，可直接分享或归档。

```json
{
  "meta": { "name": "", "version": "", "createdAt": "", "updatedAt": "" },
  "paper": { "width": 100, "height": 50, "unit": "mm", "orientation": "portrait" },
  "margin": { "top": 5, "right": 5, "bottom": 5, "left": 5 },
  "layout": { "mode": "single", "cols": 3, "rows": 8, "hGap": 2, "vGap": 2 },
  "components": [ ... ],
  "dataSource": { "embedded": true, "path": "", "data": [ ... ] },
  "fields": [ "字段名1", "字段名2" ],
  "printConfig": { "printer": "", "copies": 1, "format": "print" }
}
```

只要替换 `dataSource.data` 里的数据行，就能用同一套设计稿打印新一批标签。

---

## 技术栈

| 用途 | 依赖 |
|---|---|
| 框架 / 构建 | Vue 3.5 + Vite 6 |
| 画布引擎 | Fabric.js 6 |
| 状态管理 | Pinia |
| Excel/CSV | xlsx |
| PDF 导出 | jsPDF + html2canvas |
| 码生成 | qrcode + jsbarcode |
| 日期格式化 | dayjs |
| 文件下载 | file-saver |

---

## 项目结构

```
标签打印/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── DesignCanvas.vue        # Fabric 设计画布
│   │   ├── ComponentPanel.vue      # 左侧组件面板
│   │   ├── PropertyPanel.vue       # 右侧属性面板
│   │   ├── DataPanel.vue           # 底部数据面板
│   │   ├── Toolbar.vue             # 顶部工具栏
│   │   ├── ProjectSidebar.vue      # 项目列表侧栏
│   │   ├── OnboardingGuide.vue     # 首次使用引导
│   │   ├── PaperConfig.vue         # 纸张配置
│   │   ├── PreviewDialog.vue       # 打印预览
│   │   ├── PreflightCheckDialog.vue# 打印前体检
│   │   ├── TemplateDialog.vue      # 模板库
│   │   ├── FieldMapDialog.vue      # 字段映射
│   │   ├── PrintConfig.vue / PrintCenterDialog.vue  # 打印配置/队列
│   │   ├── AIDialog.vue / AISettingsDialog.vue      # AI 功能
│   │   └── LayoutEditor.vue        # 自动排版编辑
│   ├── stores/              # Pinia 状态管理（project / data / settings / templates / print / ai）
│   ├── utils/               # 工具函数
│   │   ├── render.js        # 模板 + 数据 → Fabric 渲染
│   │   ├── excel.js         # Excel/CSV 解析
│   │   ├── dataMerge.js     # 导入数据追加/替换合并
│   │   ├── pdf.js / barcode.js / qrcode.js / cellImage.js  # 输出与码生成
│   │   ├── canvasFit.js     # 画布缩放适配
│   │   ├── diagnose.js      # 打印前体检规则
│   │   ├── i18n.js          # 多语言
│   │   └── file.js / templates.js / ai.js
│   ├── styles/              # 全局样式与主题变量
│   ├── App.vue
│   └── main.js
├── tests/                   # 单元测试（node 直接运行）
├── index.html
├── vite.config.js
└── package.json
```

---

## 开发

```bash
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run preview    # 预览构建产物

# 单元测试
node tests/basic.test.mjs
node tests/dataMerge.test.mjs
```

---

## 参与和安全

- [贡献指南](.github/CONTRIBUTING.md)
- [行为准则](.github/CODE_OF_CONDUCT.md)
- [安全策略](.github/SECURITY.md)

缺陷和功能建议用 GitHub Issue 模板。可利用的漏洞请按安全策略私下报告，不要开公开 Issue。

## License

[MIT](LICENSE) © 2026 qqww45

非常宽松的协议：可自由使用、修改、商用、闭源，只需保留版权声明。

A permissive license: use, modify, and ship it in a closed product, as long as the copyright notice stays.
