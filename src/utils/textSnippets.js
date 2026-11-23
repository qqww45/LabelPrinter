/**
 * 合规文案片段（通用占位，无第三方品牌名）。
 */

/** @typedef {{ id: string, title: string, category: string, text: string, fontSize?: number }} TextSnippet */

/** @type {TextSnippet[]} */
export const TEXT_SNIPPETS = [
  {
    id: 'eu_importer',
    title: 'EU 进口商',
    category: '进口商信息',
    fontSize: 8,
    text: 'EU Importer:\n____________________\nAddress:\n____________________\nE-mail:\n____________________'
  },
  {
    id: 'uk_importer',
    title: 'UK 进口商',
    category: '进口商信息',
    fontSize: 8,
    text: 'UK Importer:\n____________________\nAddress:\n____________________\nE-mail:\n____________________'
  },
  {
    id: 'manufacturer',
    title: '制造商',
    category: '进口商信息',
    fontSize: 8,
    text: 'Manufacturer:\n____________________\nAddress:\n____________________'
  },
  {
    id: 'country_origin',
    title: '原产国',
    category: '产品信息',
    fontSize: 9,
    text: 'Country of Origin: __________'
  },
  {
    id: 'ce_mark_line',
    title: 'CE 符合性声明（简）',
    category: '认证',
    fontSize: 7,
    text: 'Complies with applicable EU requirements. CE marked.'
  },
  {
    id: 'batch_lot',
    title: '批号/日期',
    category: '产品信息',
    fontSize: 8,
    text: 'Batch/Lot: __________\nMfg. Date: __________'
  }
]

export function snippetCategories() {
  return [...new Set(TEXT_SNIPPETS.map(s => s.category))]
}

export function filterSnippets(query, category = '') {
  const q = String(query || '').trim().toLowerCase()
  const cat = String(category || '').trim()
  return TEXT_SNIPPETS.filter(s => {
    if (cat && s.category !== cat) return false
    if (!q) return true
    return `${s.title} ${s.category} ${s.text}`.toLowerCase().includes(q)
  })
}

export function snippetById(id) {
  return TEXT_SNIPPETS.find(s => s.id === id) || null
}