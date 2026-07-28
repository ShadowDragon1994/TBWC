export type PublishingTaskStatus = 'editing' | 'review' | 'ready' | 'published'
export type PublishingTaskDraft = { productId: string | null; creationRecordId: string | null; productName: string; platform: '小红书' | '抖音'; title: string; plannedAt: string; notes: string; status: PublishingTaskStatus; publishedUrl: string }
export type PublishingTask = PublishingTaskDraft & { id: string; actualPublishedAt: string | null; createdAt: string; updatedAt: string }
export type AutoPublishResult = { task: PublishingTask; execution: { id: string; status: 'succeeded'; externalUrl: string } }

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || '发布任务操作失败') }
  return response.status === 204 ? undefined as T : response.json()
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
export const publishingTasksApi = {
  list(filters: { platform?: string; productName?: string; status?: string } = {}) { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) }); return api<{ data: PublishingTask[] }>(`/api/publishing-tasks?${params}`) },
  create: (draft: PublishingTaskDraft) => api<{ data: PublishingTask }>('/api/publishing-tasks', json('POST', draft)),
  update: (id: string, draft: PublishingTaskDraft) => api<{ data: PublishingTask }>(`/api/publishing-tasks/${id}`, json('PUT', draft)),
  autoPublish: (id: string) => api<{ data: AutoPublishResult }>(`/api/publishing-tasks/${id}/auto-publish`, { method: 'POST' }),
  remove: (id: string) => api<void>(`/api/publishing-tasks/${id}`, { method: 'DELETE' }),
}
