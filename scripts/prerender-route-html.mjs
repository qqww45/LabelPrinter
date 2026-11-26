/**
 * After `vite build`, write route-specific index.html so crawlers get unique body + JSON-LD.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTE_SITE_META, canonicalUrlForPath } from '../src/utils/siteMeta.js'
import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL } from '../src/utils/site.js'
import {
  PRERENDER_PATHS,
  getSeoRoutePayload,
  serializeJsonLdScripts
} from '../src/content/seoStatic.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = path.join(root, 'dist', 'index.html')

if (!fs.existsSync(distIndex)) {
  console.error('prerender-route-html: dist/index.html not found — run vite build first')
  process.exit(1)
}

const baseHtml = fs.readFileSync(distIndex, 'utf8')

const HREFLANG_HOME = `  <link rel="alternate" hreflang="zh-CN" href="${OFFICIAL_SITE_URL}" />
  <link rel="alternate" hreflang="en" href="${OFFICIAL_SITE_ORIGIN}/en" />
  <link rel="alternate" hreflang="x-default" href="${OFFICIAL_SITE_URL}" />`

/** @param {string} html */
function stripHreflang(html) {
  return html.replace(/\n?\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/>/g, '')
}

/** @param {string} html */
function stripCanonical(html) {
  return html.replace(/\n?\s*<link rel="canonical" href="[^"]*"\s*\/>/, '')
}

/** @param {string} html */
/** @param {{ title: string, description: string, canonical: string, lang?: string, robots?: string, omitCanonical?: boolean }} meta */
/** @param {string} routePath */
function patchHead(html, meta, routePath) {
  let out = html
  const lang = meta.lang ?? 'zh-CN'
  out = out.replace(/<html([^>]*)lang="[^"]*"/, `<html$1lang="${lang}"`)
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
  out = out.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${meta.description}" />`
  )
  out = out.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${meta.title}" />`
  )
  out = out.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${meta.description}" />`
  )
  out = out.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${meta.canonical}" />`
  )
  out = out.replace(
    /<meta property="og:locale" content="[^"]*" \/>/,
    `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'zh_CN'}" />`
  )
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${meta.title}" />`
  )
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${meta.description}" />`
  )
  if (meta.robots) {
    out = out.replace(
      /<meta name="robots" content="[^"]*" \/>/,
      `<meta name="robots" content="${meta.robots}" />`
    )
  }

  out = stripHreflang(out)

  if (meta.omitCanonical) {
    out = stripCanonical(out)
  } else {
    out = out.replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${meta.canonical}" />`
    )
    if (routePath === '/' || routePath === '/en') {
      out = out.replace(
        /<link rel="canonical" href="[^"]*"\s*\/>/,
        (m) => `${m}\n${HREFLANG_HOME}`
      )
    }
  }

  return out
}

function patchJsonLd(html, jsonLdBlocks) {
  const scripts = serializeJsonLdScripts(jsonLdBlocks)
  return html.replace(
    /<!-- SEO_JSONLD_START -->[\s\S]*?<!-- SEO_JSONLD_END -->/,
    `<!-- SEO_JSONLD_START -->\n  ${scripts}\n  <!-- SEO_JSONLD_END -->`
  )
}

function patchBody(html, bodyHtml) {
  return html.replace(
    /<!-- SEO_BODY_START -->[\s\S]*?<!-- SEO_BODY_END -->/,
    `<!-- SEO_BODY_START -->\n  ${bodyHtml.trim()}\n  <!-- SEO_BODY_END -->`
  )
}

/** @param {string} html @param {string} routePath */
function stripVendorPdfPreload(html, routePath) {
  if (routePath === '/app') return html
  return html.replace(
    /\n?\s*<link rel="modulepreload"[^>]*href="[^"]*vendor-pdf[^"]*"[^>]*\/>/g,
    ''
  )
}

function metaForRoute(routePath) {
  const meta = ROUTE_SITE_META[routePath] ?? ROUTE_SITE_META['/']
  const canonical = canonicalUrlForPath(routePath) ?? OFFICIAL_SITE_URL
  return {
    title: meta.title,
    description: meta.description,
    canonical,
    robots: meta.robots,
    lang: routePath === '/en' ? 'en' : 'zh-CN',
    omitCanonical: routePath === '/app'
  }
}

function distPathForRoute(routePath) {
  if (routePath === '/') return distIndex
  const parts = routePath.split('/').filter(Boolean)
  return path.join(root, 'dist', ...parts, 'index.html')
}

for (const routePath of PRERENDER_PATHS) {
  const payload = getSeoRoutePayload(routePath)
  if (!payload) continue
  let html = patchHead(baseHtml, metaForRoute(routePath), routePath)
  html = patchJsonLd(html, payload.jsonLd)
  html = patchBody(html, payload.bodyHtml)
  html = stripVendorPdfPreload(html, routePath)
  const outFile = distPathForRoute(routePath)
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, html, 'utf8')
}

console.log(`prerender-route-html: wrote ${PRERENDER_PATHS.length} route HTML file(s)`)