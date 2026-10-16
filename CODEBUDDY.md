# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## 常用命令

| 命令 | 用途 |
|---|---|
| `npm install` | 安装依赖（首次或 package.json 变更后） |
| `npm run dev` | 启动 Vite dev server（默认端口 5173，HMR 热更新） |
| `npm run build` | 生产构建到 `dist/`（Vite 6 + Vue 3.5） |
| `npm run preview` | 本地预览生产构建产物 |
| `npm test` | 跑全部 `tests/*.test.mjs`（含 PDF 颜色一致性、转义、拼版等） |
| `node tests/basic.test.mjs` | 跑基础单元测试套件（约 66 项：纸/排版/打印/序列化） |
| `node tests/dataMerge.test.mjs` | 跑导入追加/替换合并函数单测（7 类边界，15 项） |
| `node tests/pdfParity.test.mjs` | PDF 拉丁字色 / 中文分流 / 价签绑定回归 |
| `node tests/samples.test.mjs` | Phase B 示例 CSV 列与行业模板边界 |
| `node tests/controls.test.mjs` | 椭圆/序号/勾选框绑定、隐藏与 AI 归一化 |
| `npx playwright-cli open http://localhost:5173/` | 启动 Playwright 浏览器会话（用于 UI 自动化验证） |
| `npx playwright-cli eval "<js>"` | 在当前页面执行 JS（可读写 Pinia store、读 DOM、截图） |
| `npx playwright-cli screenshot` | 截当前视口到 `.playwright-cli/page-*.png` |
| `npx playwright-cli close` | 关闭浏览器会话并清理临时文件 |

**添加新单测**：在 `tests/<name>.test.mjs` 写 `node` 可直接执行的纯函数测试，不要引第三方 test runner。

**运行单个测试**：当前 `tests/*.test.mjs` 是独立可执行文件，单独 `node <file>` 即跑完该文件所有用例。

**Lint**：项目无 ESLint 配置；通过 `read_lints` 工具检查 IDE 实时诊断（CSS/模板/JS 错误）。

## 部署

GitHub Actions 自动部署（`.github/workflows/deploy.yml`）：
- push 到 `main` → 构建 Docker 镜像 → 推 GHCR → SSH 服务器 `restart.sh`
- **用户约定**：功能修好后直接 `git push`，**不等 CI 部署验证**（推送成功即可）
- 推送偶发网络抖动（github 443 间歇性不通），push 失败时脚本会自动重试 4-5 次

---

## 架构概览

Vue 3.5 + Vite 6 + Pinia + Fabric.js 6 的单页标签设计与打印工具。代码分三层。

### 三层职责

1. **Stores** (`src/stores/*.js`, 7 个 Pinia stores)
   - `project.js` — 核心：项目列表/当前项目/CRUD/持久化/导入导出 JSON。`project.value.dataSource` 含 `embedded: true` + `data: Object[]`，是「数据跟着项目走」的唯一来源
   - `data.js` — 全局数据 store（headers/rows/sourcePath），是项目数据的**渲染视图**，不持久化（依赖 sync watch 回写项目）
   - `settings.js` — UI 偏好（暗色模式 `data-theme`、语言、面板宽度等）
   - `templates.js` — 模板库（内置 + 用户保存）
   - `print.js` — 打印队列与历史记录
   - `ai.js` — AI 功能状态
   - `userDefaults.js` — 用户默认值（纸张/边距等）

2. **Utils** (`src/utils/*.js`, 13 个纯函数模块)
   - 业务核心：`excel.js`（xlsx 解析）、`pdf.js`（jsPDF + html2canvas）、`barcode.js`（jsbarcode）、`qrcode.js`、`render.js`（**项目核心：把 components 配置 + 数据行渲染成 Fabric 对象**）、`canvasFit.js`（画布缩放/居中）、`cellImage.js`
   - 辅助：`dataMerge.js`（导入追加/替换按列名合并，纯函数已加 15 单测）、`templates.js`、`i18n.js`（简易 t()）、`file.js`（pickFile/saveJSON）、`diagnose.js`（打印前体检）、`ai.js`、`idb.js`（项目快照的 IndexedDB）

3. **Components** (`src/components/*.vue`, 17 个)
   - 三栏布局：左 `ProjectSidebar` + `ComponentPanel` / 中 `DesignCanvas`（Fabric 画布）/ 右 `PropertyPanel`
   - 顶部 `Toolbar`，底部 `DataPanel`
   - 弹窗：`OnboardingGuide`（首次引导，3 步含纸张预设）/ `PreflightCheckDialog`（打印前体检）/ `PreviewDialog`（打印预览）/ `TemplateDialog` / `FieldMapDialog` / `AIDialog` / `AISettingsDialog` / `PrintConfig` / `PrintCenterDialog` / `PaperConfig` / `LayoutEditor`

### 关键架构模式

**1. 数据与项目绑定（核心）**
- 每个项目自带数据副本（`project.dataSource.embedded=true` + `dataSource.data: rows`）
- `App.vue` 用 `watch(() => [data.rows, data.sourcePath], embedCurrentData, { deep: true, flush: 'sync' })` 兜底：用户编辑数据 store 后**同步**深拷贝回项目
- 切项目时 `switchToProject(id)` 先嵌入当前再切；`watch(() => project.currentId)` 加载新项目数据到 data store
- 已**完全放弃外置数据模式**（用户决定）—— 导入即内联（`onImportData` 强制 `embedded: true`）

**2. Canvas ↔ Store 同步**
- `DesignCanvas` 是 Fabric.js 容器；`project.project.components[]` 是「真理之源」（存配置：type/x/y/width/height/options/field 等）
- 选中组件 → `PropertyPanel` 编辑 → 改 store → 通过 `watch(components)` 重建 Fabric 对象
- 模板占位符：`{{字段名}}` 在渲染时由 `render.js` 替换为当前数据行

**3. 打印流程**
`components` 模板 + 数据行 → `render.js` 在隐形 Fabric canvas 上绘制 → 截图 → `pdf.js` 拼版或直接打印

**4. 样式系统**
- CSS 变量在 `src/styles/main.css` 定义，`[data-theme="dark"]` 切换
- 颜色变量：`--bg`/`--bg-panel`/`--bg-hover`/`--text`/`--text-muted`/`--text-secondary`/`--border`/`--primary`/`--primary-hover`/`--danger`/`--warning`
- **新增/修改组件禁止用硬编码颜色**（除非纸张/二维码等内容本身必须为白底）；用 `rgba(37,99,235,0.x)` 这种主色透明化模式跨主题可见

**5. i18n**
- `utils/i18n.js` 简易 `t(key)` 查表，键路径用点号
- `settings.js.currentLang` 切换 `zh-CN`/`en`

### 测试与持久化

- **测试**：纯函数 + `node` 直接跑（无 jest/vitest）。新功能若有可独立纯函数，**优先抽出到 `src/utils/` 并写 `tests/<name>.test.mjs`**
- **持久化**（项目列表，会随数据变大）：`stores/project.js` 里 `watch([project, selectedIds])` 防抖 600ms 后 `persistNow()`。同一份 `{ v: 2, currentId, list }` 写两处，键都是 `labelprint_projects_v1`：
  - `localStorage`：读得快，有配额上限
  - IndexedDB：库名 `labelprint`，对象仓库 `kv`（`src/utils/idb.js` 的 `idbGet` / `idbSet`）。`localStorage` 满了仍写这里
- 启动先 `loadFromStorage()` 读 `localStorage`。`hydrateFromIdb()` 结束前 `persistReady` 为 false，避免空项目盖掉库里的副本。库里 `updatedAt` 更新，或本地还没有项目时，改用 IndexedDB 那份
- 两处都失败才提示自动保存失败。只有 `localStorage` 满、IndexedDB 成功时，提示已改存到本地数据库
- 主题、模板、打印历史、AI Key、面板宽度等小项仍只写 `localStorage`（前缀 `labelprint_*`）。数据表不单独落盘，编辑后同步回当前项目
- 撤销快照去掉 `dataSource.data` 和表头，改单元格不进历史
