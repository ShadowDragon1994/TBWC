import type { ContentPlatform } from '../creation/creation'

export type AiSettings = { mode: 'mock' | 'real'; baseUrl: string; model: string; hasApiKey: boolean; inputPricePerMillion: number; outputPricePerMillion: number; monthlyBudget: number; updatedAt: string | null }
export type AiSettingsDraft = { mode: 'mock' | 'real'; baseUrl: string; model: string; apiKey?: string; clearApiKey?: boolean; inputPricePerMillion?: number; outputPricePerMillion?: number; monthlyBudget?: number }
export type AiGenerateDraft = { platform: ContentPlatform; product: { name: string; category: string; price: number; material?: string; audience?: string; scene?: string; sellingPoints?: string; forbiddenTerms?: string }; guidance: string; count?: number; operation?: 'generate' | 'rewrite_title' | 'rewrite_selling_points' | 'rewrite_body'; currentContent?: { title: string; sellingPoints: string[]; body: string } }
export type AiGeneratedContent = { title: string; sellingPoints: string[]; body: string; source: 'ai' }
export type AiCallUsage = { model: string; inputTokens: number | null; outputTokens: number | null; latencyMs: number; estimatedCost: number | null }
export type AiGenerateResult = AiGeneratedContent & { candidates: Array<Omit<AiGeneratedContent, 'source'>>; usage?: AiCallUsage }
export type AiUsageRecord = AiCallUsage & { id: string; operation: string; platform: ContentPlatform; success: boolean; errorMessage: string; createdAt: string }
export type AiUsageSummary = { calls: number; successfulCalls: number; inputTokens: number; outputTokens: number; estimatedCost: number; unknownUsageCalls: number; monthlyBudget: number }

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
  usage: () => api<{ data: { summary: AiUsageSummary; records: AiUsageRecord[] } }>('/api/ai/usage'),
}
