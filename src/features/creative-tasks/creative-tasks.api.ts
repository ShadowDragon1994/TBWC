import type { ContentPlatform } from '../creation/creation'

export type CreativeTaskStatus = 'draft' | 'editing' | 'checking' | 'confirming' | 'exporting' | 'completed' | 'failed'
export type CreativeTaskDraft = {
  productId: string | null
  productName: string
  platform: ContentPlatform
  title: string
  sellingPoints: string[]
  body: string
  status: CreativeTaskStatus
  failureReason: string
}
export type CreativeTask = CreativeTaskDraft & { id: string; createdAt: string; updatedAt: string }

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || '创作任务保存失败')
  }
  return response.json()
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const creativeTasksApi = {
  listActive: () => api<{ data: CreativeTask[] }>('/api/creative-tasks'),
  create: (draft: CreativeTaskDraft) => api<{ data: CreativeTask }>('/api/creative-tasks', json('POST', draft)),
  update: (id: string, draft: CreativeTaskDraft) => api<{ data: CreativeTask }>(`/api/creative-tasks/${id}`, json('PUT', draft)),
}

