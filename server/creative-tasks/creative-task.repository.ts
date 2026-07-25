import type { AppDatabase } from '../shared/database'
import type { CreativeTask, CreativeTaskQuery } from './creative-task.schema'

type Row = {
  id: string; product_id: string | null; product_name: string; platform: '小红书' | '抖音'; title: string
  selling_points: string; body: string; status: CreativeTask['status']; failure_reason: string; created_at: string; updated_at: string
}

const map = (row: Row): CreativeTask => ({
  id: row.id, productId: row.product_id, productName: row.product_name, platform: row.platform, title: row.title,
  sellingPoints: JSON.parse(row.selling_points) as string[], body: row.body, status: row.status,
  failureReason: row.failure_reason, createdAt: row.created_at, updatedAt: row.updated_at,
})

export function createCreativeTaskRepository(database: AppDatabase) {
  return {
    list(query: CreativeTaskQuery) {
      const clauses: string[] = []
      const values: string[] = []
      if (query.status) { clauses.push('status = ?'); values.push(query.status) }
      if (query.platform) { clauses.push('platform = ?'); values.push(query.platform) }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      return (database.prepare(`SELECT * FROM creative_tasks ${where} ORDER BY updated_at DESC`).all(...values) as Row[]).map(map)
    },
    find(id: string) {
      const row = database.prepare('SELECT * FROM creative_tasks WHERE id = ?').get(id) as Row | undefined
      return row ? map(row) : null
    },
    save(task: CreativeTask) {
      database.prepare(`INSERT INTO creative_tasks
        (id, product_id, product_name, platform, title, selling_points, body, status, failure_reason, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id, product_name=excluded.product_name,
        platform=excluded.platform, title=excluded.title, selling_points=excluded.selling_points, body=excluded.body,
        status=excluded.status, failure_reason=excluded.failure_reason, updated_at=excluded.updated_at`)
        .run(task.id, task.productId, task.productName, task.platform, task.title, JSON.stringify(task.sellingPoints), task.body, task.status, task.failureReason, task.createdAt, task.updatedAt)
      return task
    },
  }
}

