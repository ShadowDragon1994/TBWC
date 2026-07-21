import type { AppDatabase } from '../shared/database'
import type { CreationRecord, CreationRecordQuery } from './creation-record.schema'

type CreationRecordRow = {
  id: string; productId: string | null; productName: string; platform: string; title: string
  sellingPoints: string; body: string; createdAt: string; updatedAt: string
  source: CreationRecord['source']; versionNumber: number
}

const fromRow = (row: CreationRecordRow): CreationRecord => ({
  ...row,
  sellingPoints: JSON.parse(row.sellingPoints) as string[],
})

export function createCreationRecordRepository(database: AppDatabase) {
  const select = `SELECT id, product_id AS productId, product_name AS productName, platform, title,
    selling_points AS sellingPoints, body, source, version_number AS versionNumber,
    created_at AS createdAt, updated_at AS updatedAt FROM creation_records`
  const insert = database.prepare(`INSERT INTO creation_records
    (id,product_id,product_name,platform,title,selling_points,body,source,version_number,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
  const update = database.prepare(`UPDATE creation_records SET product_id=?,product_name=?,platform=?,title=?,selling_points=?,body=?,updated_at=? WHERE id=?`)
  const find = database.prepare(`${select} WHERE id=?`)
  const remove = database.prepare('DELETE FROM creation_records WHERE id=?')
  return {
    create(record: CreationRecord) {
      insert.run(record.id, record.productId, record.productName, record.platform, record.title, JSON.stringify(record.sellingPoints), record.body, record.source, record.versionNumber, record.createdAt, record.updatedAt)
      return record
    },
    list(query: CreationRecordQuery = { q: '', productName: '', platform: '', source: '' }) {
      const keyword = `%${query.q}%`
      return (database.prepare(`${select} WHERE (product_name LIKE ? OR title LIKE ? OR platform LIKE ?)
        AND (? = '' OR product_name = ?) AND (? = '' OR platform = ?) AND (? = '' OR source = ?)
        ORDER BY created_at DESC`).all(keyword, keyword, keyword, query.productName, query.productName, query.platform, query.platform, query.source, query.source) as CreationRecordRow[]).map(fromRow)
    },
    nextVersion(productName: string, platform: string) {
      const row = database.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 AS versionNumber FROM creation_records WHERE product_name = ? AND platform = ?').get(productName, platform) as { versionNumber: number }
      return row.versionNumber
    },
    find: (id: string) => { const row = find.get(id) as CreationRecordRow | undefined; return row ? fromRow(row) : undefined },
    update(record: CreationRecord) {
      update.run(record.productId, record.productName, record.platform, record.title, JSON.stringify(record.sellingPoints), record.body, record.updatedAt, record.id)
      return record
    },
    remove: (id: string) => remove.run(id).changes > 0,
    replaceAll(records: CreationRecord[]) {
      database.exec('BEGIN')
      try {
        database.exec('DELETE FROM creation_records')
        for (const record of records) this.create(record)
        database.exec('COMMIT')
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
    },
  }
}

export type CreationRecordRepository = ReturnType<typeof createCreationRecordRepository>
