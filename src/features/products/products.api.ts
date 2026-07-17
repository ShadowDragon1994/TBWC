export type ProductAsset = { id: string; filename: string; url?: string; storedName: string }
export type ProductRecord = {
  id: string; name: string; category: string; price: number; cost?: number | null
  material?: string; size?: string; color?: string; audience?: string; scene?: string
  sellingPoints?: string; forbiddenTerms?: string; supplier?: string; supplierUrl?: string
  assets?: ProductAsset[]; createdAt: string; updatedAt: string
}
export type ProductDraft = Omit<ProductRecord, 'id' | 'assets' | 'createdAt' | 'updatedAt'>

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || '本地服务连接失败')
  }
  return response.status === 204 ? undefined as T : response.json()
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
export const productsApi = {
  list: () => api<{ data: ProductRecord[] }>('/api/products'),
  create: (draft: ProductDraft) => api<{ data: ProductRecord }>('/api/products', json('POST', draft)),
  update: (id: string, draft: ProductDraft) => api<{ data: ProductRecord }>(`/api/products/${id}`, json('PUT', draft)),
  remove: (id: string) => api<void>(`/api/products/${id}`, { method: 'DELETE' }),
  upload: (id: string, file: File) => { const data = new FormData(); data.append('image', file); return api<{ data: ProductAsset & { url: string } }>(`/api/products/${id}/assets`, { method: 'POST', body: data }) },
  backup: () => api<Record<string, unknown>>('/api/backup'),
  restore: (backup: unknown) => api<{ data: ProductRecord[] }>('/api/backup', json('POST', backup)),
  backupArchive: async () => {
    const response = await fetch('/api/backup/archive')
    if (!response.ok) throw new Error('完整备份导出失败')
    return response.blob()
  },
  restoreArchive: (file: File) => {
    const data = new FormData()
    data.append('backup', file)
    return api<{ data: { products: number; assets: number } }>('/api/backup/archive', { method: 'POST', body: data })
  },
}
