# 产品 backlog（无 Docker 自托管）

官方演示与生产部署：**EdgeOne 边缘部署** → [ci64.com](https://ci64.com/)（见 `edgeone.json`、`.github/workflows/deploy.yml`）。fork 后请用同一套 EdgeOne/Pages 流程，不在文档中推荐 Docker 自建。

## 已在本仓库落地或进行中的能力

- 数据内嵌在项目 JSON；导入后字段映射向导；清除本机数据前备份
- 引导 / 快速体验：示例表 → 模板 → 预览
- 打印中心入口：热敏本机校准（跳转打印设置）
- EAN-13 等条码 preflight（`barcodeScan.js` + 体检）
- 行业场景包数据定义（`src/utils/scenePacks.js`）

## Mid-term（待排期）

- **场景包 UI**：模板库按 `SCENE_PACKS` 一键「模板 + 示例 + 预览」
- **无账号协作**：强调「下载项目 JSON / 备份包」传递设计+表格；可选 ci64.com 深链分享（仍无登录）
- **Golden 回归**：扩展 `pdfParity.test.mjs` → 固定组件夹具的 PNG/PDF 哈希对比（CI 内跑）
- **TSPL/ZPL 增量**：在现有 `printerCmd.js` + 校准签基础上，预览页一键下载指令（已部分存在）

## Strategic

- **本地数据 + 可选 AI 网关**：内置 `/ai-chat` 限流；BYOK 走用户所选厂商
- **热敏生态**：校准 → 业务标签 TSPL/ZPL → 浏览器 Raw Print 实验
- **Edge-only 托管**：功能与文档只围绕 EdgeOne + 静态 `dist/`，不维护 Docker 双轨
