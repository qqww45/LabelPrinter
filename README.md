# 标签打印工具 (Label Printer)

基于 Vue 3 + Vite + Fabric.js 的**标签设计与批量打印工具**。

可视化设计标签模板，导入 Excel/CSV 数据，自动填充生成成百上千张标签，直接打印或导出 PDF/图片。适合产品标签、快递面单、价签、资产标签、条码吊牌等场景。

**在线演示**：https://label.s.ci64.com

---

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
- **AI 辅助**：AI 生成/优化标签布局（需在设置里配置 API）
- **主题**：亮色 / 暗色
- **多语言**：简体中文 / English
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
