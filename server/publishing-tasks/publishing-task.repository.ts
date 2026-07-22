import type { AppDatabase } from '../shared/database'
import type { PublishingTask, PublishingTaskQuery } from './publishing-task.schema'

type Row = {
  id: string; product_id: string | null; creation_record_id: string | null; product_name: string; platform: '小红书' | '抖音'
  title: string; planned_at: string; notes: string; status: PublishingTask['status']; published_url: string
  actual_published_at: string | null; created_at: string; updated_at: string
}

const map = (row: Row): PublishingTask => ({
  id: row.id, productId: row.product_id, creationRecordId: row.creation_record_id, productName: row.product_name,
  platform: row.platform, title: row.title, plannedAt: row.planned_at, notes: row.notes, status: row.status,
  publishedUrl: row.published_url, actualPublishedAt: row.actual_published_at, createdAt: row.created_at, updatedAt: row.updated_at,
})

export function createPublishingTaskRepository(database: AppDatabase) {
  return {
    list(query: PublishingTaskQuery) {
      const clauses: string[] = []
      const values: string[] = []
      if (query.platform) { clauses.push('platform = ?'); values.push(query.platform) }
      if (query.status) { clauses.push('status = ?'); values.push(query.status) }
      if (query.productName) { clauses.push('product_name LIKE ?'); values.push(`%${query.productName}%`) }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      return (database.prepare(`SELECT * FROM publishing_tasks ${where} ORDER BY planned_at ASC`).all(...values) as Row[]).map(map)
    },
    find(id: string) {
      const row = database.prepare('SELECT * FROM publishing_tasks WHERE id = ?').get(id) as Row | undefined
      return row ? map(row) : null
    },
    save(task: PublishingTask) {
      database.prepare(`INSERT INTO publishing_tasks (id, product_id, creation_record_id, product_name, platform, title, planned_at, notes, status, published_url, actual_published_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id, creation_record_id=excluded.creation_record_id, product_name=excluded.product_name, platform=excluded.platform, title=excluded.title, planned_at=excluded.planned_at, notes=excluded.notes, status=excluded.status, published_url=excluded.published_url, actual_published_at=excluded.actual_published_at, updated_at=excluded.updated_at`)
        .run(task.id, task.productId, task.creationRecordId, task.productName, task.platform, task.title, task.plannedAt, task.notes, task.status, task.publishedUrl, task.actualPublishedAt, task.createdAt, task.updatedAt)
      return task
    },
    remove(id: string) { return database.prepare('DELETE FROM publishing_tasks WHERE id = ?').run(id).changes > 0 },
    replaceAll(tasks: PublishingTask[]) {
      database.exec('BEGIN')
      try {
        database.prepare('DELETE FROM publishing_tasks').run()
        tasks.forEach(task => this.save(task))
        database.exec('COMMIT')
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
      return tasks
    },
  }
}
