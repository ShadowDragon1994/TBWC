import type { ContentPlatform } from '../creation/creation'

export type AiSettings = { mode: 'mock' | 'real'; baseUrl: string; model: string; hasApiKey: boolean; updatedAt: string | null }
export type AiSettingsDraft = { mode: 'mock' | 'real'; baseUrl: string; model: string; apiKey?: string; clearApiKey?: boolean }
export type AiGenerateDraft = { platform: ContentPlatform; product: { name: string; category: string; price: number; material?: string; audience?: string; scene?: string; sellingPoints?: string; forbiddenTerms?: string }; guidance: string; count?: number; operation?: 'generate' | 'rewrite_title' | 'rewrite_selling_points' | 'rewrite_body'; currentContent?: { title: string; sellingPoints: string[]; body: string } }
export type AiGeneratedContent = { title: string; sellingPoints: string[]; body: string; source: 'ai' }
export type AiGenerateResult = AiGeneratedContent & { candidates: Array<Omit<AiGeneratedContent, 'source'>> }

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || '本地 AI 服务连接失败') }
  return response.json()
}
const json = (method: string, body?: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

export const aiApi = {
  settings: () => api<{ data: AiSettings }>('/api/ai/settings'),
  saveSettings: (draft: AiSettingsDraft) => api<{ data: AiSettings }>('/api/ai/settings', json('PUT', draft)),
  test: () => api<{ data: { connected: true; model: string } }>('/api/ai/test', json('POST')),
  generate: (draft: AiGenerateDraft) => api<{ data: AiGenerateResult }>('/api/ai/generate', json('POST', draft)),
}
