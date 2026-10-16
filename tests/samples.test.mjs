/**
 * 示例 CSV + 内置模板字段对齐（纯函数，不启浏览器）
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCSVText } from '../src/utils/excel.js'
import { SAMPLE_DATASETS, findSampleIdForTemplate, findSampleForTemplate } from '../src/utils/samples.js'
import { BUILTIN_TEMPLATES } from '../src/utils/templates.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) {
    passed++
    console.log(`  ✓ ${msg}`)
  } else {
    failed++
    console.error(`  ✗ ${msg}`)
  }
}

console.log('samples / Phase B templates')

assert(SAMPLE_DATASETS.length === 6, '6 sample datasets registered')
assert(SAMPLE_DATASETS.every(s => s.path.startsWith('/samples/')), 'sample paths under /samples/')
assert(findSampleIdForTemplate('tpl_grocery_price') === 'retail', 'grocery → retail sample')
assert(findSampleIdForTemplate('tpl_price_tag') === 'retail', 'price tag → retail sample')
assert(findSampleIdForTemplate('tpl_express') === 'express', 'express → express sample')
assert(findSampleIdForTemplate('tpl_asset_fixed') === 'asset', 'asset → asset sample')
assert(findSampleIdForTemplate('tpl_jewelry') === 'jewelry', 'jewelry → jewelry sample')
assert(findSampleIdForTemplate('tpl_apparel_hang') === 'apparel', 'apparel → apparel sample')
assert(findSampleIdForTemplate('tpl_warehouse_bin') === 'warehouse', 'warehouse → warehouse sample')
assert(findSampleForTemplate('tpl_express')?.fileName === 'sample-express.csv', 'sample meta by template')

const fileMap = {
  retail: 'public/samples/sample-retail.csv',
  express: 'public/samples/sample-express.csv',
  asset: 'public/samples/sample-asset.csv',
  jewelry: 'public/samples/sample-jewelry.csv',
  apparel: 'public/samples/sample-apparel.csv',
  warehouse: 'public/samples/sample-warehouse.csv'
}

for (const s of SAMPLE_DATASETS) {
  const rel = fileMap[s.id]
  assert(!!rel, `${s.id} has local file mapping`)
  const text = readFileSync(join(root, rel), 'utf8')
  const { headers, rows } = parseCSVText(text)
  assert(headers.length >= 3, `${s.id} has ≥3 columns`)
  assert(rows.length >= 5, `${s.id} has ≥5 rows`)
  assert(s.fileName === rel.split('/').pop(), `${s.id} fileName matches`)
}

const retail = parseCSVText(readFileSync(join(root, fileMap.retail), 'utf8'))
for (const col of ['品名', '产品名称', '规格', '单价', '单位', '条码', '价格', '货位', '产地']) {
  assert(retail.headers.includes(col), `retail has column ${col}`)
}

const express = parseCSVText(readFileSync(join(root, fileMap.express), 'utf8'))
for (const col of ['收件人', '电话', '地址', '单号']) {
  assert(express.headers.includes(col), `express has column ${col}`)
}

const asset = parseCSVText(readFileSync(join(root, fileMap.asset), 'utf8'))
for (const col of ['资产编号', '名称', '部门', '保管人']) {
  assert(asset.headers.includes(col), `asset has column ${col}`)
}

const jewelry = parseCSVText(readFileSync(join(root, fileMap.jewelry), 'utf8'))
for (const col of ['品名', '克重', '工费', '条码']) {
  assert(jewelry.headers.includes(col), `jewelry has column ${col}`)
}

const apparel = parseCSVText(readFileSync(join(root, fileMap.apparel), 'utf8'))
for (const col of ['款号', '尺码', '颜色', '吊牌价', '条码']) {
  assert(apparel.headers.includes(col), `apparel has column ${col}`)
}

const warehouse = parseCSVText(readFileSync(join(root, fileMap.warehouse), 'utf8'))
for (const col of ['库位', 'SKU', '品名']) {
  assert(warehouse.headers.includes(col), `warehouse has column ${col}`)
}

// 每个内置模板都能找到示例，且模板 fields 都在示例列里
for (const tpl of BUILTIN_TEMPLATES) {
  const sample = findSampleForTemplate(tpl.id)
  assert(!!sample, `template ${tpl.id} has sample`)
  if (!sample) continue
  const csv = parseCSVText(readFileSync(join(root, fileMap[sample.id]), 'utf8'))
  for (const f of tpl.fields || []) {
    assert(csv.headers.includes(f), `${tpl.id} field「${f}」in ${sample.id}`)
  }
}

const phaseBIds = [
  'tpl_grocery_price',
  'tpl_jewelry',
  'tpl_apparel_hang',
  'tpl_shelf_strip',
  'tpl_asset_fixed',
  'tpl_warehouse_bin'
]
for (const id of phaseBIds) {
  const tpl = BUILTIN_TEMPLATES.find(t => t.id === id)
  assert(!!tpl, `template ${id} exists`)
  if (tpl) {
    assert(Array.isArray(tpl.components) && tpl.components.length > 0, `${id} has components`)
    assert(tpl.paper.width === tpl.label.width && tpl.paper.height === tpl.label.height, `${id} single-label paper matches label`)
    assert(tpl.margin?.top === 0 && tpl.margin?.left === 0, `${id} zero margin for label paper`)
  }
}

const grocery = BUILTIN_TEMPLATES.find(t => t.id === 'tpl_grocery_price')
const priceComp = grocery?.components.find(c => c.name === '单价')
assert(priceComp?.fill === '#d0021b', 'grocery price uses red fill')
assert(String(priceComp?.text || '').includes('{{单价}}'), 'grocery price binds 单价')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
