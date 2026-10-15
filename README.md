# 标签打印工具 (Label Printer)

基于 Vue 3 + Vite + Fabric.js 的标签设计与打印工具。

## 功能特性

- 纸张设计：自定义纸张尺寸、边距、自动排版
- 数据绑定：Excel/CSV 导入，字段拖拽绑定
- 组件支持：文本、图片、二维码、条形码、表格、形状
- 项目管理：JSON 格式保存设计稿，方便替换数据复用
- 打印输出：直接打印、导出 PDF、导出图片

## 演示地址
https://label.s.ci64.com

## 环境要求

- Node.js >= 18（推荐 24）
- npm >= 9

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（自动打开浏览器）
npm run dev

# 构建生产版本
npm run build
```

启动后浏览器访问 http://localhost:5173

## 核心依赖

- **Vue 3.5** + **Vite 6** - 现代前端框架与构建工具
- **Fabric.js 6** - 矢量画布引擎（标签设计）
- **Pinia** - 状态管理
- **xlsx** - Excel/CSV 导入导出
- **jsPDF + html2canvas** - PDF 导出
- **qrcode + jsbarcode** - 二维码/条形码生成
- **dayjs** - 日期格式化
- **file-saver** - 文件下载

## 项目结构

```
标签打印/
├── electron/           # Electron 主进程（可选）
├── src/
│   ├── components/    # Vue 组件
│   │   ├── DesignCanvas.vue    # 设计画布
│   │   ├── ComponentPanel.vue  # 左侧组件面板
│   │   ├── PropertyPanel.vue   # 右侧属性面板
│   │   ├── DataPanel.vue       # 数据面板
│   │   ├── Toolbar.vue         # 顶部工具栏
│   │   └── PaperConfig.vue     # 纸张配置弹窗
│   ├── views/         # 页面
│   ├── stores/        # Pinia 状态管理
│   ├── utils/         # 工具函数
│   │   ├── excel.js   # Excel 导入导出
│   │   ├── pdf.js     # PDF 导出
│   │   ├── barcode.js # 条形码生成
│   │   └── qrcode.js  # 二维码生成
│   ├── App.vue
│   └── main.js
├── index.html
├── vite.config.js
└── package.json
```

## 项目文件格式 (.json)

```json
{
  "meta": { "name": "", "version": "", "createdAt": "", "updatedAt": "" },
  "paper": { "width": 100, "height": 50, "unit": "mm", "orientation": "portrait" },
  "margin": { "top": 5, "right": 5, "bottom": 5, "left": 5 },
  "layout": { "mode": "single", "cols": 3, "rows": 8, "hGap": 2, "vGap": 2 },
  "components": [ ... ],
  "dataSource": { "path": "", "embedded": false },
  "fields": [ "字段名1", "字段名2" ],
  "printConfig": { "printer": "", "copies": 1, "format": "print" }
}
```

## 使用流程

1. **新建/打开项目** → 文件菜单
2. **配置纸张** → 工具栏纸张按钮
3. **拖入组件** → 左侧面板拖到画布
4. **绑定数据** → 左侧字段列表拖到组件
5. **导入数据** → 数据面板"导入 Excel/CSV"
6. **预览** → 工具栏预览按钮
7. **打印/导出** → 工具栏对应按钮

## 路线图

- **M1（已完成）**：纸张 + 文本/图片/二维码/条形码/形状/日期 + Excel 导入 + 直接打印 + PDF/图片导出 + 项目 JSON 保存
- **M2（已完成）**：自动排版（多列）✓ + 表格组件（列宽比例/表头样式/单元格类型）✓ + 模板库（6 个内置模板 + 我的模板）✓ + 字段映射兼容 ✓
- **M3（已完成）**：打印队列 ✓ + 历史记录（重打）✓ + 主题（亮/暗）✓ + 多语言（中/英）✓ + 撤销/重做（Ctrl+Z/Y）✓

## 使用说明

### 工作流程
1. **新建/打开项目** → 顶部文件按钮
2. **配置纸张** → 顶部"纸张"按钮（预设 + 自定义）
3. **添加组件** → 左侧组件面板，拖入画布
4. **绑定数据** → 左侧"数据字段"列表拖到画布组件上
5. **导入数据** → 底部数据面板"导入 Excel/CSV"，第一行作为字段名
6. **预览** → 顶部"预览"按钮，可翻页、缩放
7. **打印/导出** → 预览界面内：打印、导出 PDF、导出图片

### 项目复用
- 保存的项目为 `.json` 格式，包含设计稿和数据快照（可选）
- 默认**外置引用**数据，替换数据文件即可重新打印
- 勾选**内嵌快照**后，JSON 自包含数据，便于分享
