/**
 * 用户偏好：跨项目记住"上次用的尺寸/排版"
 *
 * 场景：项目级配置存在 localStorage（按项目 key），新建项目时回到硬编码默认
 *       → 用户每次新建都要重新设置纸张/标签/排版
 * 解决：把这些"用户最近的选择"单独存到 localStorage（不跟项目走），
 *       新建项目 / 应用模板时优先用这里
 */
const KEY = 'labelprint_user_defaults_v1'

const DEFAULTS = {
  paper: { width: 100, height: 100, backgroundColor: '#ffffff' },
  label: {
    width: 60, height: 40, backgroundColor: '#ffffff',
    showBorder: false, borderColor: '#000000', borderWidth: 0.3
  },
  layout: { mode: 'single', sizingMode: 'auto', cols: 1, rows: 1, hGap: 2, vGap: 2 }
}

export function getUserDefaults() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return JSON.parse(JSON.stringify(DEFAULTS))
    const parsed = JSON.parse(raw)
    // 深合并：缺字段时回退到硬编码默认（兼容旧版本）
    return {
      paper: { ...DEFAULTS.paper, ...(parsed.paper || {}) },
      label: { ...DEFAULTS.label, ...(parsed.label || {}) },
      layout: { ...DEFAULTS.layout, ...(parsed.layout || {}) }
    }
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS))
  }
}

/** 增量更新（部分字段变化也只更新该字段） */
export function saveUserDefaults(patch) {
  try {
    const cur = getUserDefaults()
    const next = { ...cur }
    if (patch.paper)  next.paper  = { ...cur.paper,  ...patch.paper }
    if (patch.label)  next.label  = { ...cur.label,  ...patch.label }
    if (patch.layout) next.layout = { ...cur.layout, ...patch.layout }
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (e) {
    console.warn('保存用户偏好失败:', e)
  }
}
