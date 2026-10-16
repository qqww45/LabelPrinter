// 首屏绘制前同步主题。放在 public/：构建不改写、不换文件名。
// 必须是阻塞的普通脚本，不能加 type="module" / defer / async，否则加载屏会先画出来。
try {
  var saved = JSON.parse(localStorage.getItem('labelprint_settings_v1') || '{}')
  if (saved.theme === 'dark') document.documentElement.dataset.theme = 'dark'
} catch (e) { /* 读不到本地设置就保持浅色 */ }
