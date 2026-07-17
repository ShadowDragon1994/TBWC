import type { AppDatabase } from '../shared/database'
import type { CreationRecord } from './creation-record.schema'

type CreationRecordRow = {
  id: string; productId: string | null; productName: string; platform: string; title: string
  sellingPoints: string; body: string; createdAt: string; updatedAt: string
}

const fromRow = (row: CreationRecordRow): CreationRecord => ({
  ...row,
  sellingPoints: JSON.parse(row.sellingPoints) as string[],
})

export function createCreationRecordRepository(database: AppDatabase) {
  const select = `SELECT id, product_id AS productId, product_name AS productName, platform, title,
    selling_points AS sellingPoints, body, created_at AS createdAt, updated_at AS updatedAt FROM creation_records`
  const insert = database.prepare(`INSERT INTO creation_records
    (id,product_id,product_name,platform,title,selling_points,body,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
  const update = database.prepare(`UPDATE creation_records SET product_id=?,product_name=?,platform=?,title=?,selling_points=?,body=?,updated_at=? WHERE id=?`)
  const find = database.prepare(`${select} WHERE id=?`)
  const remove = database.prepare('DELETE FROM creation_records WHERE id=?')
  return {
    create(record: CreationRecord) {
      insert.run(record.id, record.productId, record.productName, record.platform, record.title, JSON.stringify(record.sellingPoints), record.body, record.createdAt, record.updatedAt)
      return record
    },
    list(query = '') {
      const normalized = `%${query.trim()}%`
      return (database.prepare(`${select} WHERE product_name LIKE ? OR title LIKE ? OR platform LIKE ? ORDER BY updated_at DESC`).all(normalized, normalized, normalized) as CreationRecordRow[]).map(fromRow)
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
