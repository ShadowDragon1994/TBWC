import type { AppDatabase } from '../shared/database'

type CachedOpportunityResponse = { data: unknown[]; meta: Record<string, unknown> }

export function createOpportunityCacheRepository(database: AppDatabase) {
  const find = database.prepare('SELECT keywords, response FROM opportunity_cache WHERE id = 1')
  const save = database.prepare(`
    INSERT INTO opportunity_cache(id, keywords, response, updated_at) VALUES(1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET keywords=excluded.keywords, response=excluded.response, updated_at=excluded.updated_at
  `)
  return {
    find(keywords: string[]): CachedOpportunityResponse | undefined {
      const row = find.get() as { keywords: string; response: string } | undefined
      if (!row || row.keywords !== JSON.stringify(keywords)) return undefined
      return JSON.parse(row.response) as CachedOpportunityResponse
    },
    save(keywords: string[], response: CachedOpportunityResponse) {
      save.run(JSON.stringify(keywords), JSON.stringify(response), new Date().toISOString())
    },
  }
}
