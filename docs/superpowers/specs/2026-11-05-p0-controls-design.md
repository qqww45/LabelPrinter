# P0 设计器控件（2026-11-05 已批准）

## 范围

| 类别 | 内容 |
|------|------|
| 新增组件 | `price`（价格）、`divider`（分隔线）、`dashedBox`（虚线框） |
| 增强 | 现有 `barcode`：格式 CODE128 / EAN13 / CODE39；`displayValue` 控制人读数字 |
| 不做 | 富文本 |

## 架构（Approach A）

与 `serial` / `checkbox` 相同：

1. `ComponentPanel` 注册入口与图层名
2. `DesignCanvas.addComponent` 默认尺寸与字段
3. 纯函数放在 `src/utils/controls.js`（格式化、线型等）
4. `PropertyPanel` 属性表单
5. 输出路径共用：`DesignCanvas` → `PreviewDialog` → `vectorPdf.js` / `printerCmd.js` → `printModel.js`

画布真理之源仍是 `project.components[]`。

## 数据模型

### price

- `binding`：数据列
- `currency`：默认 `¥`
- `decimals`：默认 `2`
- 可选 `prefix` / `suffix`
- 展示：`formatPriceText(c, row)`（与模板 `{{价格|price}}` 数值解析一致）
- 空/非法：有数据行时显示 `—`；无数据行时显示样例价便于排版
- 复用文本类：`fontSize` / `fill` / `fontFamily` / `fontWeight` / `textAlign` / `hideIfEmpty`

### divider

- `direction`：`horizontal` | `vertical`
- `strokeWidth`、`strokeStyle`（`solid` | `dashed` | `dotted`）、`stroke`（颜色）

### dashedBox

- `width` / `height`（组件几何）
- `rx` 圆角、`stroke` / `strokeWidth`、`strokeStyle`（线型）
- 默认 `fill: transparent`（无填充）

### barcode（增强）

- `format` ∈ CODE128 | EAN13 | CODE39
- `displayValue`：boolean，默认 `true`（与历史模板、JsBarcode 默认一致）
- 未写字段的旧模板按 CODE128 + 显示数字行为
- EAN-13 位数/校验错误：不伪造条码，画布/预览显示 `barcodeScan` 提示

## 属性面板（中文标签）

- **价格**：字段、货币、小数位、前缀/后缀、字号/对齐/字色（同文本）
- **分隔线**：方向、粗细、实线/虚线/点线、颜色
- **虚线框**：圆角、边框宽、线型、边框色（无填充）
- **条形码**：格式、显示人读数字、保留绑定/尺寸/数字高度

## 渲染与兼容

- 未知 `type` 不崩溃（预览 `default: null`，AI normalize 跳过并警告）
- 条码/二维码空绑定不伪造内容
- PDF 拉丁字仍走 `setTextColor`；价格含 `¥` 时走现有 CJK 描边路径

## 验证

```bash
npm test
node tests/controls.test.mjs
```

手工：

1. 组件库可见 **价格 / 分隔线 / 虚线框**
2. 条形码属性有格式 +「显示人读数字」
3. 绑定「价格」列，空值显示 `—`，有值格式化
4. EAN-13 填 12 位：虚线框内错误文案，无假条码
5. 预览 / 导出 PDF 与画布一致
