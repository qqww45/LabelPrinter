# 参与贡献

感谢你愿意改进标签打印工具。这是一个在浏览器里运行的 Vue 3 应用，数据保存在本机，不依赖后端服务器。

## 开始之前

- 搜索已有的 [Issue](https://github.com/qqww45/LabelPrinter/issues) 和 Pull Request，避免重复劳动。
- 较大的功能或会改变打印结果的改动，请先开一个 Issue 说明做法。
- 缺陷、功能和安全问题请分开提。安全漏洞不要写进公开 Issue，见 [安全策略](SECURITY.md)。

## 本地开发

环境：Node.js 18 及以上（推荐 20+），npm 9 及以上。

```bash
npm install
npm run dev
```

开发服务器默认是 http://localhost:5173 。改完界面后，在浏览器里把受影响的路径点一遍：设计画布、打印预览、导出 PDF、导出图片。

## 测试

测试是 `tests/*.test.mjs` 里可直接用 node 运行的纯函数，不使用第三方测试框架。

```bash
node tests/basic.test.mjs
node tests/dataMerge.test.mjs
node tests/fieldAndAi.test.mjs
node tests/printUpgrade.test.mjs
```

能抽成纯函数的逻辑放到 `src/utils/`，并在 `tests/` 里补对应用例。

## 改代码时请注意

- 设计画布、打印预览、PDF 和图片导出应呈现同一版式。改其中一条渲染路径时，核对另外几条。
- 样式使用 `src/styles/main.css` 里的主题变量，不要写死颜色。纸张、二维码等内容本身必须是白底时除外。
- 新增界面文案时，在 `src/utils/i18n.js` 补上英文对照。
- 每个项目的数据内嵌在项目里。不要恢复已放弃的外置数据模式。
- 不要提交 API Key、`.env`、本机数据或浏览器里导出的项目文件。

## 提交 Pull Request

1. 从最新的 `main` 拉出分支。
2. 保持改动集中，一个 PR 解决一件事。
3. 提交说明写清原因。仓库的 commit-msg 钩子会去掉协作工具自动加上的 `Co-authored-by` 行。
4. 按 [Pull Request 模板](PULL_REQUEST_TEMPLATE.md) 填写验证方式。
5. 维护者确认后合并。请不要直接推送到 `main`。

## 行为准则

参与讨论和提交代码即表示同意 [贡献者公约](CODE_OF_CONDUCT.md)。
