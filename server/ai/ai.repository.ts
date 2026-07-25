import type { AppDatabase } from '../shared/database'

export type StoredAiSettings = { mode: 'mock' | 'real'; baseUrl: string; model: string; encryptedApiKey: string; inputPricePerMillion: number; outputPricePerMillion: number; monthlyBudget: number; updatedAt: string }

export function createAiSettingsRepository(database: AppDatabase) {
  const get = database.prepare(`SELECT mode,base_url AS baseUrl,model,encrypted_api_key AS encryptedApiKey,input_price_per_million AS inputPricePerMillion,output_price_per_million AS outputPricePerMillion,monthly_budget AS monthlyBudget,updated_at AS updatedAt FROM ai_settings WHERE id=1`)
  const save = database.prepare(`INSERT INTO ai_settings (id,mode,base_url,model,encrypted_api_key,input_price_per_million,output_price_per_million,monthly_budget,updated_at) VALUES (1,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET mode=excluded.mode,base_url=excluded.base_url,model=excluded.model,encrypted_api_key=excluded.encrypted_api_key,input_price_per_million=excluded.input_price_per_million,output_price_per_million=excluded.output_price_per_million,monthly_budget=excluded.monthly_budget,updated_at=excluded.updated_at`)
  return {
    get: () => get.get() as StoredAiSettings | undefined,
    save(settings: StoredAiSettings) { save.run(settings.mode, settings.baseUrl, settings.model, settings.encryptedApiKey, settings.inputPricePerMillion, settings.outputPricePerMillion, settings.monthlyBudget, settings.updatedAt); return settings },
  }
}
