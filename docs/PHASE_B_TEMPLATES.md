# Phase B：行业模板与示例数据包

目标：获客与上手速度；**不改**打印/PDF 核心算法。

状态：**已落地**（内置模板 + `public/samples/` + 引导/数据面板「加载示例」）。

## 新增模板

| ID | 名称 | 尺寸 | 字段 | 备注 |
|---|---|---|---|---|
| `tpl_grocery_price` | 超市价签 70×40 | 单张标签纸 | 品名、规格、单价、单位、条码 | 大红价格 |
| `tpl_jewelry` | 珠宝签 50×20 | 细长 | 品名、克重、工费、条码 | 小字密集 |
| `tpl_apparel_hang` | 服装吊牌 40×60 | 竖版 | 款号、尺码、颜色、吊牌价、条码 | |
| `tpl_shelf_strip` | 货架条 100×30 | 宽条 | 品名、货位、价格 | |
| `tpl_asset_fixed` | 固定资产 60×40 | 含二维码 | 资产编号、名称、部门、保管人 | |
| `tpl_warehouse_bin` | 库位签 80×50 | 大号二维码 | 库位、SKU、品名 | |

现有内置模板保留：价格标签、二维码价签、货架 A4、快递面单等。实现见 `src/utils/templates.js`。

## 示例数据包

路径：`public/samples/`（虚构数据，无真实隐私）。清单与加载逻辑：`src/utils/samples.js`。

| 文件 | 列 | 行数 |
|---|---|---|
| `sample-retail.csv` | 品名,规格,单价,单位,价格,条码,货位 | 10 |
| `sample-express.csv` | 收件人,电话,地址,品名,数量,单号 | 5 |
| `sample-asset.csv` | 资产编号,名称,部门,保管人 | 8 |

导入入口：

- 引导第 3 步：三份示例按钮 → `load-sample`
- 数据面板空态 / 工具栏「加载示例」→ `fetch` → `parseCSVText` → `applyImported`
- 已有数据时仍弹出追加/替换确认

## 落地页内容（仍可单页）

- README / 首页 FAQ JSON-LD 已覆盖价签、快递、资产、货架场景锚点 `#use-*`。
- 后续若流量上来，再拆独立落地路由；当前不强行上 Vue Router。

## 验收

- 新模板应用后：画布、预览、打印、PDF、PNG 一致。
- 红价签类模板：PDF 拉丁价格色不丢（`npm test` + 人工对照）。
- 示例导入不覆盖用户未确认的现有数据（沿用追加/替换对话框）。
- 单测：`node tests/samples.test.mjs`（含在 `npm test` 内）。
