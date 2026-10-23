/**
 * POST /ai-chat —— 标签打印工具的内置 AI 端点
 *
 * 浏览器 → 本端点（不携带任何 Key）→ EdgeOne AI Gateway（Key 来自 context.env）
 * 只做三件事：校验、限流、转发。不存会话、不落日志。
 *
 * 路由：agents/ai-chat/index.ts → POST /ai-chat
 */

const DEFAULT_MODEL = '@makers/deepseek-v4-flash'
const MAX_MESSAGES = 24
const MAX_TOTAL_CHARS = 16000
const MAX_TOKENS_CAP = 4096
const RATE_WINDOW_MS = 5 * 60 * 1000
const RATE_MAX = 30
const UPSTREAM_TIMEOUT_MS = 120_000

/** 内存限流：按进程计数，够挡住随手刷，挡不住分布式攻击 */
const hits = new Map<string, { n: number; resetAt: number }>()

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

function clientIp(context: any): string {
  const h = context?.request?.headers || {}
  const xff = String(h['x-forwarded-for'] || '')
  return (xff.split(',')[0] || '').trim() || String(h['x-real-ip'] || '') || 'unknown'
}

function tooManyRequests(ip: string): boolean {
  const now = Date.now()
  const cur = hits.get(ip)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k)
  }
  if (!cur || now > cur.resetAt) {
    hits.set(ip, { n: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  cur.n += 1
  return cur.n > RATE_MAX
}

/** 清洗 messages：只要三种角色，截掉超长内容，防有人拿它当免费大模型玩 */
function sanitizeMessages(raw: unknown): Array<{ role: string; content: unknown }> {
  if (!Array.isArray(raw)) return []
  const out: Array<{ role: string; content: unknown }> = []
  let budget = MAX_TOTAL_CHARS
  for (const m of raw) {
    if (out.length >= MAX_MESSAGES) break
    if (!m || typeof m !== 'object') continue
    const role = String((m as any).role || '')
    if (role !== 'system' && role !== 'user' && role !== 'assistant') continue
    const content = (m as any).content

    if (typeof content === 'string') {
      if (!content) continue
      const text = content.length > budget ? content.slice(0, budget) : content
      budget -= text.length
      out.push({ role, content: text })
      continue
    }
    // 视觉模型的多段内容：只放行 text / image_url
    if (Array.isArray(content)) {
      const parts = content
        .filter((p: any) => p && (p.type === 'text' || p.type === 'image_url'))
        .slice(0, 4)
      if (!parts.length) continue
      const size = JSON.stringify(parts).length
      if (size > budget) continue
      budget -= size
      out.push({ role, content: parts })
    }
  }
  return out
}

function clampTokens(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 2048
  return Math.max(256, Math.min(MAX_TOKENS_CAP, Math.round(n)))
}

function clampTemperature(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0.4
  return Math.max(0, Math.min(1, n))
}

function upstreamError(text: string, statusText: string): string {
  try {
    const j = JSON.parse(text)
    return j?.error?.message || j?.message || statusText
  } catch (e) {
    return statusText
  }
}

export async function onRequest(context: any): Promise<Response> {
  const request = context?.request || {}
  const method = String(request.method || 'POST').toUpperCase()
  if (method !== 'POST') return jsonRes({ error: 'Method Not Allowed' }, 405)

  // ⭐ 只允许 context.env，绝不用 process.env
  const env = context?.env || {}
  const apiKey = env.AI_GATEWAY_API_KEY
  const baseUrl = env.AI_GATEWAY_BASE_URL
  if (!apiKey || !baseUrl) {
    return jsonRes({ error: 'AI Gateway 未配置：请确认 .env.example 声明了 AI_GATEWAY_API_KEY / AI_GATEWAY_BASE_URL' }, 500)
  }

  if (tooManyRequests(clientIp(context))) {
    return jsonRes({ error: '请求过于频繁，请稍后再试' }, 429)
  }

  const body = request.body || {}
  const messages = sanitizeMessages(body.messages)
  if (!messages.length) return jsonRes({ error: 'messages 为空或格式不正确' }, 400)

  const model = String(env.AI_GATEWAY_MODEL || DEFAULT_MODEL)
  const payload = {
    model,
    messages,
    temperature: clampTemperature(body.temperature),
    max_tokens: clampTokens(body.maxTokens),
    stream: false
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  if (request.signal) request.signal.addEventListener('abort', onAbort)

  try {
    const resp = await fetch(String(baseUrl).replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
    const text = await resp.text()
    if (!resp.ok) {
      return jsonRes({ error: '上游返回 HTTP ' + resp.status + '：' + upstreamError(text, resp.statusText) }, 502)
    }
    let data: any = {}
    try {
      data = JSON.parse(text)
    } catch (e) {
      return jsonRes({ error: '上游返回不是 JSON' }, 502)
    }
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return jsonRes({ error: '上游未返回可用内容' }, 502)
    return jsonRes({ content, model: data?.model || model, usage: data?.usage || null })
  } catch (e: any) {
    if (e?.name === 'AbortError') return jsonRes({ error: '请求已取消' }, 499)
    return jsonRes({ error: e?.message || '上游请求失败' }, 502)
  } finally {
    clearTimeout(timer)
    if (request.signal) request.signal.removeEventListener('abort', onAbort)
  }
}
