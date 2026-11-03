/**
 * 默认落点：深链不覆盖；裸 `/` 有本地项目 → `/app`，否则留首页。
 */

export const KNOWN_SITE_PATHS = new Set(['/', '/templates', '/help', '/app'])

/** @returns {string|null} 目标路径；null 表示不跳转 */
export function resolveDefaultPath({ hasProjects, path = '/', query = {} }) {
  if (query?.home === '1') return null
  const base = (path || '/').split('?')[0].split('#')[0] || '/'
  if (base !== '/' && base !== '') return null
  return hasProjects ? '/app' : '/'
}

/** 解析 localStorage 里的项目列表是否有可恢复项目 */
export function hasStoredProjects(raw) {
  if (raw == null || raw === '') return false
  try {
    const parsed = JSON.parse(raw)
    const list = parsed?.list
    return Array.isArray(list) && list.length > 0
  } catch {
    return false
  }
}

export function readHasStoredProjects(getItem = (k) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}) {
  return hasStoredProjects(getItem('labelprint_projects_v1'))
}
