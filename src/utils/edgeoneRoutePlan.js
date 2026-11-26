/**
 * EdgeOne Pages routes.json (Build Output API v3) — single source for unit tests + build script.
 */
import { TEMPLATE_SCENE_SLUGS } from '../content/templateSceneSeo.js'

/** Query keys that block scene→landing 301 (preserve attribution / extra filters). */
export const SCENE_REDIRECT_BLOCKING_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'gclid',
  'fbclid',
  'industry',
  'size',
  'purpose',
  'q',
  'pick'
]

/** @param {string} p */
export function re2EscapePath(p) {
  return String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** @param {string} pathWithSlash */
function stripTrailingSlashRoute(pathWithSlash) {
  const trimmed = pathWithSlash.replace(/\/$/, '')
  if (!trimmed || trimmed === '/') return null
  return {
    src: `^${re2EscapePath(pathWithSlash)}$`,
    headers: { Location: trimmed },
    status: 301
  }
}

/**
 * @param {readonly string[]} paths — e.g. PRERENDER_PATHS
 * @returns {string[]}
 */
export function marketingPathsForTrailingSlashRedirect(paths) {
  return paths.filter((p) => p && p !== '/' && p !== '/app')
}

/**
 * @param {readonly string[]} paths
 */
export function buildTrailingSlashStripRoutes(paths) {
  const routes = []
  const seen = new Set()
  for (const p of marketingPathsForTrailingSlashRedirect(paths)) {
    const withSlash = `${p}/`
    if (seen.has(withSlash)) continue
    seen.add(withSlash)
    const r = stripTrailingSlashRoute(withSlash)
    if (r) routes.push(r)
  }
  return routes
}

/**
 * 301 /templates?scene={landing} → /templates/{landing} when scene is the only “action” query.
 */
export function buildSceneQueryRedirectRoutes(slugs = TEMPLATE_SCENE_SLUGS) {
  const routes = []
  for (const slug of slugs) {
    routes.push({
      src: '^/templates$',
      has: [{ type: 'query', key: 'scene', value: `^${re2EscapePath(slug)}$` }],
      missing: SCENE_REDIRECT_BLOCKING_QUERY_KEYS.map((key) => ({ type: 'query', key })),
      headers: { Location: `/templates/${slug}` },
      status: 301
    })
  }
  return routes
}

/**
 * @param {string} prefix e.g. /help
 * @param {string[]} validChildPaths full paths e.g. /help/excel-import
 */
export function buildPrefixChild404Routes(prefix, validChildPaths) {
  const valid = [...validChildPaths.filter((p) => p.startsWith(`${prefix}/`) && p !== prefix)]
  const routes = []
  for (const p of valid) {
    const rest = p.slice(prefix.length + 1)
    if (!rest || rest.includes('/')) continue
    routes.push({ src: `^${re2EscapePath(p)}$`, dest: `${p}/index.html` })
  }
  const prefixEsc = re2EscapePath(prefix)
  routes.push({
    src: `^${prefixEsc}/[^/]+$`,
    dest: '/404.html',
    status: 404
  })
  return routes
}

/**
 * @param {{
 *   prerenderPaths: readonly string[],
 *   templateSceneSlugs?: readonly string[],
 *   edgeoneRedirects?: Array<{ source: string, destination: string, statusCode?: number }>
 * }} opts
 */
export function buildEdgeOneRoutes(opts) {
  const { prerenderPaths, templateSceneSlugs = TEMPLATE_SCENE_SLUGS, edgeoneRedirects = [] } = opts

  /** @type {EdgeOneRoute[]} */
  const routes = []

  for (const red of edgeoneRedirects) {
    const status = Number(red.statusCode) || 301
    const dest = String(red.destination)
    const location = dest.startsWith('http') ? dest : dest.startsWith('/') ? dest : `/${dest}`
    routes.push({
      src: `^${re2EscapePath(red.source)}$`,
      headers: { Location: location },
      status
    })
  }

  routes.push(...buildSceneQueryRedirectRoutes(templateSceneSlugs))
  routes.push(...buildTrailingSlashStripRoutes(prerenderPaths))

  const templateChildren = templateSceneSlugs.map((s) => `/templates/${s}`)
  routes.push(...buildPrefixChild404Routes('/templates', templateChildren))

  const helpChildren = prerenderPaths.filter((p) => p.startsWith('/help/') && p !== '/help')
  routes.push(...buildPrefixChild404Routes('/help', helpChildren))

  const useCaseChildren = prerenderPaths.filter((p) => p.startsWith('/use-cases/'))
  routes.push(...buildPrefixChild404Routes('/use-cases', useCaseChildren))

  for (const p of prerenderPaths) {
    if (!p || p === '/' || p === '/app') continue
    if (p.slice(1).includes('/')) continue
    routes.push({ src: `^${re2EscapePath(p)}$`, dest: `${p}/index.html` })
  }

  const hasNestedIndex = prerenderPaths.some((p) => p.includes('/') && p !== '/app')
  if (hasNestedIndex) {
    routes.push({ src: '^/([^.]+[^/.])$', dest: '/$1/', continue: true })
  }

  routes.push({ handle: 'filesystem' })
  routes.push({
    src: '/.*',
    dest: '/404.html',
    status: 404,
    'server-name': 'file'
  })

  return { version: 3, routes }
}

/** @typedef {Record<string, unknown>} EdgeOneRoute */