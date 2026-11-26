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

/** Static file 404 response (must match post-filesystem catch-all). */
export const FILE_404_RESPONSE = {
  dest: '/404.html',
  status: 404,
  'server-name': 'file'
}

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

/** 301 any trailing slash (except `/`) → canonical path without slash. */
export const GENERAL_TRAILING_SLASH_STRIP = {
  src: '^/(.+)/$',
  headers: { Location: '/$1' },
  status: 301
}

/**
 * Internal rewrite so unknown nested marketing paths miss filesystem (EdgeOne otherwise
 * returns empty 404 + Location to the default project prefix). Not a client redirect and
 * not pre-fs /404.html — filesystem misses like /foo, then post-fs catch-all.
 */
export const NESTED_MARKETING_PREFIX_MISS_REWRITE = {
  src: '^/(templates|help|use-cases)/.+$',
  dest: '/__not_found'
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
 * Explicit dest for known single-segment children (e.g. /templates/retail-price → index.html).
 *
 * Do NOT add pre-filesystem 404 rules for unknown children under /templates, /help, or
 * /use-cases. Live on EdgeOne Pages (2026-11): `dest: '/404.html', status: 404` before
 * `handle: filesystem` resets the connection (curl 56 / HTTP2 INTERNAL_ERROR), with or without
 * `server-name: file`. Unknown paths must miss these dest rules, then filesystem, then the
 * post-filesystem catch-all (same path as /foo).
 *
 * @param {string} prefix e.g. /help
 * @param {string[]} validChildPaths full paths e.g. /help/excel-import
 */
export function buildPrefixChildDestRoutes(prefix, validChildPaths) {
  const valid = [...validChildPaths.filter((p) => p.startsWith(`${prefix}/`) && p !== prefix)]
  const routes = []
  for (const p of valid) {
    const rest = p.slice(prefix.length + 1)
    if (!rest || rest.includes('/')) continue
    routes.push({ src: `^${re2EscapePath(p)}$`, dest: `${p}/index.html` })
  }
  return routes
}

/** @deprecated use buildPrefixChildDestRoutes — name kept for import stability in tests */
export const buildPrefixChild404Routes = buildPrefixChildDestRoutes

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
  routes.push(...buildPrefixChildDestRoutes('/templates', templateChildren))

  const helpChildren = prerenderPaths.filter((p) => p.startsWith('/help/') && p !== '/help')
  routes.push(...buildPrefixChildDestRoutes('/help', helpChildren))

  const useCaseChildren = prerenderPaths.filter((p) => p.startsWith('/use-cases/'))
  routes.push(...buildPrefixChildDestRoutes('/use-cases', useCaseChildren))

  for (const p of prerenderPaths) {
    if (!p || p === '/' || p === '/app') continue
    if (p.slice(1).includes('/')) continue
    routes.push({ src: `^${re2EscapePath(p)}$`, dest: `${p}/index.html` })
  }

  // Do not use add-slash `continue` — on EdgeOne it makes filesystem fetch `{path}/index.html`
  // under prefixes with child dirs, COS NoSuchKey → platform 404 instead of post-fs catch-all.
  routes.push({ ...GENERAL_TRAILING_SLASH_STRIP })
  routes.push({ ...NESTED_MARKETING_PREFIX_MISS_REWRITE })

  routes.push({ handle: 'filesystem' })
  routes.push({
    src: '/.*',
    ...FILE_404_RESPONSE
  })

  return { version: 3, routes }
}

/** @typedef {Record<string, unknown>} EdgeOneRoute */