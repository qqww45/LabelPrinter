# 性能测量清单（不改输出算法）

目标：缩短首屏与交互等待；**禁止**为性能拆开画布/预览/PDF 两套渲染路径。

## 构建基线

```bash
npm run build
```

关注 `dist/assets/`：

| Chunk | 预期角色 | 备注 |
|---|---|---|
| `index-*.js` | 壳层（工具栏/侧栏/数据面板） | 应明显小于 fabric/xlsx/pdf |
| `vendor-vue-*` | Vue + Pinia | 首屏必需 |
| `vendor-fabric-*` | 画布 | 异步加载 DesignCanvas 后才进 |
| `vendor-xlsx-*` | Excel | 仅导入/导出 xlsx 时加载 |
| `vendor-pdf-*` | jsPDF / html2canvas | 仅预览导出时加载 |
| `vendor-codes-*` | 条码 / 二维码 | 画布或导出触发 |

记录每次发布的 gzip 大小，回退时对比。

## 运行时检查（Chrome DevTools）

1. **LCP**：冷刷新 `https://label.s.ci64.com/`（或本地 `npm run preview`）
   - 加载屏应马上出现（`index.html` 内联）
   - 工具栏/侧栏应早于 fabric 可交互
2. **Network**：禁用缓存，看 `vendor-fabric` 是否在首屏 JS 之后
3. **Coverage**：打开预览前不应下载 `vendor-pdf`
4. **Interaction**：大表（>80 行）滚动应走 DataPanel 虚拟列表，不卡主线程数秒

## 已做的安全优化（勿回退）

- `defineAsyncComponent(DesignCanvas)` + idle 预取画布
- 弹窗异步加载
- `xlsx` 动态 `import`
- Vite `manualChunks`

## 允许的下一步（仍不改版式）

- idle 预取 `PreviewDialog`（用户点过一次打印后再预取亦可）
- 生产环境开启 `build.reportCompressedSize` 对比日志
- 用 Marketplace `web-perf` / Lighthouse 打分存档（目标：不追求满分，避免牺牲 PDF 质量）

## 明确不做

- 为砍首包而让 PDF 改走 html2canvas 全图路径
- Service Worker 缓存旧版 `vectorPdf` 导致「修了颜色用户仍下到旧包」却无版本戳
