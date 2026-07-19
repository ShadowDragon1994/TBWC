import type { AppDatabase } from '../shared/database'

export type StoredAiSettings = { mode: 'mock' | 'real'; baseUrl: string; model: string; encryptedApiKey: string; updatedAt: string }

export function createAiSettingsRepository(database: AppDatabase) {
  const get = database.prepare(`SELECT mode,base_url AS baseUrl,model,encrypted_api_key AS encryptedApiKey,updated_at AS updatedAt FROM ai_settings WHERE id=1`)
  const save = database.prepare(`INSERT INTO ai_settings (id,mode,base_url,model,encrypted_api_key,updated_at) VALUES (1,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET mode=excluded.mode,base_url=excluded.base_url,model=excluded.model,encrypted_api_key=excluded.encrypted_api_key,updated_at=excluded.updated_at`)
  return {
    get: () => get.get() as StoredAiSettings | undefined,
    save(settings: StoredAiSettings) { save.run(settings.mode, settings.baseUrl, settings.model, settings.encryptedApiKey, settings.updatedAt); return settings },
  }
}
