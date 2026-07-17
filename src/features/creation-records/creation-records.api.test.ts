import { afterEach, describe, expect, it, vi } from 'vitest'
import { creationRecordsApi } from './creation-records.api'

afterEach(() => vi.unstubAllGlobals())

describe('creation records API client', () => {
  it('saves and searches local creation records', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'r1' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const draft = { productId: null, productName: '青瓷杯', platform: '通用', title: '标题', sellingPoints: ['卖点'], body: '' }

    await creationRecordsApi.create(draft)
    await creationRecordsApi.list('青瓷')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/creation-records', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/creation-records?q=%E9%9D%92%E7%93%B7', undefined)
  })
})
