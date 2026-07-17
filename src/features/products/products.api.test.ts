import { afterEach, describe, expect, it, vi } from 'vitest'
import { productsApi } from './products.api'

afterEach(() => vi.unstubAllGlobals())

describe('products API client', () => {
  it('sends product data to the local API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'p1', name: '新商品' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await productsApi.create({ name: '新商品', category: '文创', price: 19 })
    expect(fetchMock).toHaveBeenCalledWith('/api/products', expect.objectContaining({ method: 'POST' }))
  })

  it('turns API errors into readable messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: '名称不能为空' }), { status: 422, headers: { 'Content-Type': 'application/json' } })))
    await expect(productsApi.create({ name: '', category: '文创', price: 19 })).rejects.toThrow('名称不能为空')
  })

  it('downloads and restores a complete ZIP backup', async () => {
    const archive = new Blob(['zip-content'], { type: 'application/zip' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(archive, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { products: 1, assets: 1 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(productsApi.backupArchive()).resolves.toBeInstanceOf(Blob)
    await productsApi.restoreArchive(new File([archive], 'backup.zip', { type: 'application/zip' }))

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backup/archive')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backup/archive', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }))
  })
})
