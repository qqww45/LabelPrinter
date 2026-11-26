import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL } from './site.js'
import { ROUTE_SITE_META } from './siteMeta.js'
import { hasTemplateSceneLanding } from '../content/templateSceneSeo.js'

/**
 * Canonical path (no origin) for a vue-router location.
 * @param {{ path?: string, query?: Record<string, string | string[] | null | undefined> }} to
 * @returns {string | null} null only for /app
 */
export function canonicalPathForRoute(to) {
  const path = to?.path || '/'
  const query = to?.query || {}

  if (path === '/app') return null

  if (path === '/templates') {
    const scene = typeof query.scene === 'string' ? query.scene : ''
    if (scene && hasTemplateSceneLanding(scene)) {
      return `/templates/${scene}`
    }
    return '/templates'
  }

  const meta = ROUTE_SITE_META[path]
  if (!meta) return '/'
  if (meta.canonicalPath === '/') return '/'
  return meta.canonicalPath
}

/**
 * @param {{ path?: string, query?: Record<string, unknown> }} to
 * @returns {string | null}
 */
export function canonicalUrlForRoute(to) {
  const cPath = canonicalPathForRoute(to)
  if (cPath === null) return null
  if (cPath === '/') return OFFICIAL_SITE_URL
  return `${OFFICIAL_SITE_ORIGIN}${cPath}`
}