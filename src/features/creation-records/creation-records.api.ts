export type CreationRecordDraft = {
  productId: string | null
  productName: string
  platform: string
  title: string
  sellingPoints: string[]
  body: string
}

export type CreationRecord = CreationRecordDraft & { id: string; createdAt: string; updatedAt: string }

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
  list: (query = '') => api<{ data: CreationRecord[] }>(`/api/creation-records?q=${encodeURIComponent(query)}`),
  create: (draft: CreationRecordDraft) => api<{ data: CreationRecord }>('/api/creation-records', json('POST', draft)),
  update: (id: string, draft: CreationRecordDraft) => api<{ data: CreationRecord }>(`/api/creation-records/${id}`, json('PUT', draft)),
  remove: (id: string) => api<void>(`/api/creation-records/${id}`, { method: 'DELETE' }),
}
