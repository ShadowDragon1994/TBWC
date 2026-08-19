import { describe, expect, it, vi } from 'vitest'
import { createXiaohongshuMcpAdapter } from './xiaohongshu-mcp.adapter'

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
}

describe('Xiaohongshu MCP adapter', () => {
  it('initializes an MCP session and publishes image content with product binding', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-03-26', capabilities: {}, serverInfo: { name: 'xhs', version: '1' } } }, { 'mcp-session-id': 'session-1' }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: '{"feed_id":"note-1","url":"https://www.xiaohongshu.com/explore/note-1"}' }] } }))
    const adapter = createXiaohongshuMcpAdapter({ url: 'http://127.0.0.1:18060/mcp', fetchImpl })

    const result = await adapter.execute({
      id: 'job-1',
      capability: 'xiaohongshu.publish',
      payload: { title: '青瓷礼物', content: '正文', images: ['D:/images/cover.png'], tags: ['礼物'], products: ['青瓷杯'] },
    })

    expect(result).toMatchObject({ externalId: 'note-1', externalUrl: 'https://www.xiaohongshu.com/explore/note-1' })
    expect(fetchImpl).toHaveBeenLastCalledWith('http://127.0.0.1:18060/mcp', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'mcp-session-id': 'session-1' }),
      body: expect.stringContaining('"name":"publish_content"'),
    }))
  })

  it('maps keyword search results into trend collection output', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-03-26', capabilities: {}, serverInfo: {} } }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 2, result: { structuredContent: { feeds: [{ id: 'a', title: '非遗漆扇礼盒', liked_count: 120, collected_count: 45, comment_count: 8 }] } } }))
    const adapter = createXiaohongshuMcpAdapter({ url: 'http://127.0.0.1:18060/mcp', fetchImpl })

    const result = await adapter.execute({
      id: 'job-2',
      capability: 'xiaohongshu.trends.collect',
      payload: { keyword: '非遗漆扇', filters: { sort_by: '最多收藏', publish_time: '一周内' } },
    })

    expect(result.output).toMatchObject({ keyword: '非遗漆扇', feeds: expect.any(Array), simulated: false })
  })

  it('rejects MCP tool results that report an internal deadline error', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-03-26', capabilities: {}, serverInfo: {} } }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 2, result: { isError: true, content: [{ type: 'text', text: '工具 search_feeds 执行时发生内部错误：context deadline exceeded' }] } }))
    const adapter = createXiaohongshuMcpAdapter({ url: 'http://127.0.0.1:18060/mcp', fetchImpl })

    await expect(adapter.execute({ id: 'job-3', capability: 'xiaohongshu.trends.collect', payload: { keyword: '教师节书签' } }))
      .rejects.toThrow('context deadline exceeded')
    expect(String(fetchImpl.mock.calls.at(-1)?.[1]?.body)).not.toContain('filters')
  })
})
