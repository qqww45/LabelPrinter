# 产品 backlog（无 Docker 自托管）

官方演示与生产部署：**EdgeOne 边缘部署** → [ci64.com](https://ci64.com/)（见 `edgeone.json`、`.github/workflows/deploy.yml`）。fork 后请用同一套 EdgeOne/Pages 流程，不在文档中推荐 Docker 自建。

## 已在本仓库落地

- 场景包一键：欢迎页 / 引导 / 模板库 → `applyScenePack`（模板 + 示例 + 字段映射 + 预览）
- 字段映射记忆：`fieldMapArchive` + 导入弹窗 / 映射对话框「用上次映射」
- 热敏校准写入项目 `printConfig.calibrate`；Print Center / 预览 TSPL·ZPL 用 `getEffectiveCalibrate`
- 导入：追加 / 替换 / **按主键增量更新**（`mergeDataByKey`）
- 场景加权 preflight + 问题行列表 +「只打印通过的行」
- 预览「更多」与打印中心：下载 TSPL / ZPL（不替代浏览器打印 / PDF）
- 打印历史：**重打这一批**（恢复 `printSnapshot` 打印范围）
- 纸张配置：热敏常用尺寸快捷 chip + mm 与浏览器边距说明

## 仍待排期

- **Golden 回归**：扩展 `pdfParity.test.mjs` → 固定组件夹具 PNG/PDF 哈希（CI）
- **无账号协作深链**：ci64.com 带项目快照参数（仍无登录）
- **浏览器 Raw Print 实验**：在 TSPL/ZPL 之外探索 WebUSB（风险高、机型杂）
- **按历史批次精确还原勾选行**：当前仅恢复 printConfig 范围，未存逐行 `__id` 快照（历史体积考虑）

## Strategic

- 本地数据 + 可选 AI 网关；BYOK
- 热敏生态：校准 → 指令 → 可选 Raw Print
- Edge-only 托管文档与功能，不维护 Docker 双轨
