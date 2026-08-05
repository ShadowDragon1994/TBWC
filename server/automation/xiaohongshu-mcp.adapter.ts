import type { AutomationAdapter, AutomationCapability } from './automation.service'

type McpResult = {
  content?: Array<{ type: string; text?: string }>
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function parseToolOutput(result: McpResult) {
  if (result.structuredContent) return result.structuredContent
  const text = result.content?.find(item => item.type === 'text')?.text ?? ''
  try { return objectValue(JSON.parse(text)) } catch { return { text } }
}

export function createXiaohongshuMcpAdapter({
  url,
  fetchImpl = fetch,
}: {
  url: string
  fetchImpl?: typeof fetch
}): AutomationAdapter {
  let requestId = 0
  let sessionId = ''

  async function post(method: string, params: Record<string, unknown>, notification = false) {
    requestId += 1
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    }
    if (sessionId) headers['mcp-session-id'] = sessionId
    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', ...(notification ? {} : { id: requestId }), method, params }),
      signal: AbortSignal.timeout(70_000),
    })
    if (!response.ok) throw new Error(`小红书 MCP 请求失败：HTTP ${response.status}`)
    sessionId ||= response.headers.get('mcp-session-id') ?? ''
    if (notification || response.status === 202) return {}
    const body = objectValue(await response.json())
    const error = objectValue(body.error)
    if (error.message) throw new Error(`小红书 MCP 错误：${String(error.message)}`)
    return objectValue(body.result) as McpResult
  }

  async function ensureSession() {
    if (requestId > 0) return
    await post('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'zaowutai', version: '0.1.0' },
    })
    await post('notifications/initialized', {}, true)
  }

  async function callTool(name: string, args: Record<string, unknown>) {
    await ensureSession()
    const result = await post('tools/call', { name, arguments: args })
    if (result.isError) {
      const message = result.content?.find(item => item.type === 'text')?.text ?? `${name} 执行失败`
      throw new Error(`小红书 MCP 工具错误：${message}`)
    }
    return parseToolOutput(result)
  }

  return {
    id: 'xiaohongshu-mcp',
    name: '小红书 MCP',
    capabilities: ['xiaohongshu.trends.collect', 'xiaohongshu.publish'],
    async execute(job: { id: string; capability: AutomationCapability; payload: Record<string, unknown> }) {
      if (job.capability === 'xiaohongshu.trends.collect') {
        const keyword = String(job.payload.keyword ?? '').trim()
        if (!keyword) throw new Error('趋势采集必须提供关键词')
        const output = await callTool('search_feeds', { keyword, filters: objectValue(job.payload.filters) })
        return { output: { keyword, ...output, simulated: false } }
      }
      if (job.capability === 'xiaohongshu.publish') {
        const title = String(job.payload.title ?? '').trim()
        const content = String(job.payload.content ?? job.payload.notes ?? '').trim()
        const images = Array.isArray(job.payload.images) ? job.payload.images.map(String) : []
        if (!title || !content || images.length === 0) throw new Error('发布必须提供标题、正文和至少一张图片')
        const output = await callTool('publish_content', {
          title, content, images,
          tags: Array.isArray(job.payload.tags) ? job.payload.tags.map(String) : [],
          products: Array.isArray(job.payload.products) ? job.payload.products.map(String) : [],
          ...(job.payload.scheduleAt ? { schedule_at: job.payload.scheduleAt } : {}),
        })
        const externalId = String(output.feed_id ?? output.feedId ?? '')
        return {
          externalId,
          externalUrl: String(output.url ?? output.feed_url ?? (externalId ? `https://www.xiaohongshu.com/explore/${externalId}` : '')),
          output,
        }
      }
      throw new Error(`小红书 MCP 不支持能力：${job.capability}`)
    },
  }
}
