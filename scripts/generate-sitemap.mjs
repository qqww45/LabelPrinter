/**
 * Write public/sitemap.xml (and optional dist/) from seoStatic SITEMAP_* metadata.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SITEMAP_PATHS,
  SITEMAP_ENTRIES
} from '../src/content/seoStatic.js'
import { OFFICIAL_SITE_ORIGIN, OFFICIAL_SITE_URL } from '../src/utils/site.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function locForPath(routePath) {
  return routePath === '/' ? OFFICIAL_SITE_URL : `${OFFICIAL_SITE_ORIGIN}${routePath}`
}

function renderSitemapXml() {
  const urls = SITEMAP_PATHS.map((routePath) => {
    const entry = SITEMAP_ENTRIES[routePath]
    if (!entry) throw new Error(`missing SITEMAP_ENTRIES for ${routePath}`)
    return `  <url>
    <loc>${locForPath(routePath)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
}

const xml = renderSitemapXml()
const publicPath = path.join(root, 'public', 'sitemap.xml')
fs.writeFileSync(publicPath, xml, 'utf8')

const distPath = path.join(root, 'dist', 'sitemap.xml')
if (fs.existsSync(path.join(root, 'dist'))) {
  fs.writeFileSync(distPath, xml, 'utf8')
}

console.log(`generate-sitemap: wrote ${SITEMAP_PATHS.length} URLs`)