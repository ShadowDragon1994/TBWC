import type { AppDatabase } from '../shared/database'
import type { SourcingOffer } from './sourcing.types'

export function createSourcingOfferRepository(database: AppDatabase) {
  const upsert = database.prepare(`INSERT INTO sourcing_offers(id,source,offer_json,collected_at) VALUES(?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET source=excluded.source,offer_json=excluded.offer_json,collected_at=excluded.collected_at`)
  const find = database.prepare('SELECT offer_json FROM sourcing_offers WHERE id=?')
  return {
    saveAll(source: string, offers: SourcingOffer[]) {
      const now = new Date().toISOString()
      offers.forEach(offer => upsert.run(offer.id, source, JSON.stringify(offer), now))
      return offers
    },
    find(id: string) {
      const row = find.get(id) as { offer_json: string } | undefined
      return row ? JSON.parse(row.offer_json) as SourcingOffer : undefined
    },
  }
}
