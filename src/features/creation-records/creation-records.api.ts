export type CreationRecordDraft = {
  productId: string | null
  productName: string
  platform: string
  title: string
  sellingPoints: string[]
  body: string
  source?: CreationRecordSource
}

export type CreationRecordSource = 'generate' | 'rewrite_title' | 'rewrite_selling_points' | 'rewrite_body' | 'manual'
export type PublishStatus = 'draft' | 'ready' | 'published'
export type CreationRecord = CreationRecordDraft & { source: CreationRecordSource; versionNumber: number; publishStatus: PublishStatus; publishedUrl: string; id: string; createdAt: string; updatedAt: string }
export type CreationRecordFilters = { q?: string; productName?: string; platform?: string; source?: CreationRecordSource | '' }

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || '本地服务连接失败')
  }
  return response.status === 204 ? undefined as T : response.json()
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const creationRecordsApi = {
  list(filters: string | CreationRecordFilters = '') {
    const values = typeof filters === 'string' ? { q: filters } : filters
    const params = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value) })
    return api<{ data: CreationRecord[] }>(`/api/creation-records?${params.toString()}`)
  },
  create: (draft: CreationRecordDraft) => api<{ data: CreationRecord }>('/api/creation-records', json('POST', draft)),
  update: (id: string, draft: CreationRecordDraft) => api<{ data: CreationRecord }>(`/api/creation-records/${id}`, json('PUT', draft)),
  updatePublication: (id: string, publishStatus: PublishStatus, publishedUrl = '') => api<{ data: CreationRecord }>(`/api/creation-records/${id}/publication`, json('PATCH', { publishStatus, publishedUrl })),
  remove: (id: string) => api<void>(`/api/creation-records/${id}`, { method: 'DELETE' }),
}
