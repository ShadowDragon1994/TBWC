import { afterEach, describe, expect, it, vi } from 'vitest'
import { aiApi } from './ai.api'

afterEach(() => vi.unstubAllGlobals())

describe('AI API client', () => {
  it('saves settings and requests platform content from the local gateway', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { mode: 'real', hasApiKey: true } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { title: '标题', sellingPoints: ['卖点'], body: '正文', source: 'ai' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { summary: { calls: 1, estimatedCost: 0.01 }, records: [] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await aiApi.saveSettings({ mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'model', apiKey: 'secret' })
    await aiApi.generate({ platform: '抖音', product: { name: '商品', category: '礼品', price: 10 }, guidance: '' })
    await aiApi.usage()
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/ai/settings', expect.objectContaining({ method: 'PUT' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/ai/generate', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/ai/usage', undefined)
  })
})
