---
name: labelprint-output-parity
description: >-
  Enforce design/preview/print/PDF/PNG visual parity for the label printer app.
  Use when changing render.js, vectorPdf.js, printModel.js, PreviewDialog,
  DesignCanvas, pdf.js, barcode/qrcode, or any export/print path.
---

# 输出一致性（Output Parity）

## 硬约束

- 画布 ≈ 预览 ≈ 打印 ≈ PDF ≈ PNG：版式、尺寸（mm）、颜色不得无故漂移。
- **禁止**为了「优化」重写 `PreviewDialog` 的 `cloneNode` 打印链路，或另起一套 PDF 排版引擎。
- 改颜色/字体/隐藏逻辑：先改纯函数并加 `tests/*.test.mjs`，再动 UI。

## 改这些文件时必跑

```bash
npm test
```

至少覆盖：

| 文件 | 关注点 |
|---|---|
| `src/utils/vectorPdf.js` | 拉丁字用 `setTextColor`（不是 `setFillColor`）；中文走 canvas 小图也要带 `fill`；表格单元格字色 |
| `src/utils/render.js` | 占位符、空行、条码 payload |
| `src/utils/printModel.js` | 隐藏条件、拼版、份数 |
| `src/utils/escapeHtml.js` | 预览 innerHTML 转义；`safeImageSrc` |
| `src/components/PreviewDialog.vue` | 打印仍 clone 预览 DOM；文案已 escape |

## 人工对照清单（改 PDF/打印后）

1. 模板「二维码价签」：中文品名黑字 + 价格红字（`#d0021b`）+ 左侧二维码。
2. 导出 PDF：价格仍为红色，不是黑。
3. 浏览器打印预览：与画布同一相对位置。
4. 导出 PNG：颜色与预览一致。
5. 空绑定条码/二维码：不伪造内容、不崩。

## 安全与输出

- 预览 HTML：先 `renderText` 再 `escapeHtmlWithBreaks`。
- 图片：`safeImageSrc`；PDF `addImage` 同样过滤危险协议，不改正常 http(s)/data:image 版式。
