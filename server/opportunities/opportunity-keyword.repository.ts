import type { AppDatabase } from '../shared/database'

export function createOpportunityKeywordRepository(database: AppDatabase) {
  const list = () => (database.prepare('SELECT keyword FROM opportunity_keywords ORDER BY position').all() as Array<{ keyword: string }>).map(row => row.keyword)
  const insert = database.prepare('INSERT INTO opportunity_keywords(position, keyword) VALUES(?, ?)')
  return {
    list,
    replace(keywords: string[]) {
      database.exec('BEGIN')
      try {
        database.exec('DELETE FROM opportunity_keywords')
        keywords.forEach((keyword, position) => insert.run(position, keyword))
        database.exec('COMMIT')
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
      return list()
    },
  }
}
