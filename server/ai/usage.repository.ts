import { randomUUID } from 'node:crypto'
import type { AppDatabase } from '../shared/database'

export type AiUsageRecord = {
  id: string
  operation: string
  platform: '小红书' | '抖音'
  model: string
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number
  estimatedCost: number | null
  success: boolean
  errorMessage: string
  createdAt: string
}

type Row = {
  id: string; operation: string; platform: '小红书' | '抖音'; model: string; inputTokens: number | null
  outputTokens: number | null; latencyMs: number; estimatedCost: number | null; success: number; errorMessage: string; createdAt: string
}

const map = (row: Row): AiUsageRecord => ({ ...row, success: Boolean(row.success) })

export function createAiUsageRepository(database: AppDatabase) {
  const insert = database.prepare(`INSERT INTO ai_usage_records
    (id,operation,platform,model,input_tokens,output_tokens,latency_ms,estimated_cost,success,error_message,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
  return {
    create(input: Omit<AiUsageRecord, 'id' | 'createdAt'>) {
      const record = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }
      insert.run(record.id, record.operation, record.platform, record.model, record.inputTokens, record.outputTokens, record.latencyMs, record.estimatedCost, record.success ? 1 : 0, record.errorMessage, record.createdAt)
      return record
    },
    list(limit = 50) {
      return (database.prepare(`SELECT id,operation,platform,model,input_tokens AS inputTokens,output_tokens AS outputTokens,
        latency_ms AS latencyMs,estimated_cost AS estimatedCost,success,error_message AS errorMessage,created_at AS createdAt
        FROM ai_usage_records ORDER BY created_at DESC LIMIT ?`).all(limit) as Row[]).map(map)
    },
    summarize(since: string) {
      return database.prepare(`SELECT COUNT(*) AS calls,COALESCE(SUM(success),0) AS successfulCalls,
        COALESCE(SUM(input_tokens),0) AS inputTokens,COALESCE(SUM(output_tokens),0) AS outputTokens,
        COALESCE(SUM(estimated_cost),0) AS estimatedCost,SUM(CASE WHEN input_tokens IS NULL OR output_tokens IS NULL THEN 1 ELSE 0 END) AS unknownUsageCalls
        FROM ai_usage_records WHERE datetime(created_at) >= datetime(?)`).get(since) as {
          calls: number; successfulCalls: number; inputTokens: number; outputTokens: number; estimatedCost: number; unknownUsageCalls: number
        }
    },
  }
}
