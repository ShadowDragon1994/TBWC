import type { AppDatabase } from '../shared/database'
import type { AutomationExecution, AutomationStore } from './automation.service'

type Row = {
  id: string; adapter_id: string; capability: AutomationExecution['capability']; status: AutomationExecution['status']
  external_id: string; external_url: string; output: string; error_message: string; started_at: string; finished_at: string | null
}
const fromRow = (row: Row): AutomationExecution => ({
  id: row.id, adapterId: row.adapter_id, capability: row.capability, status: row.status,
  externalId: row.external_id, externalUrl: row.external_url,
  output: JSON.parse(row.output) as Record<string, unknown>, errorMessage: row.error_message,
  startedAt: row.started_at, finishedAt: row.finished_at,
})

export function createAutomationRepository(database: AppDatabase): AutomationStore {
  const save = database.prepare(`
    INSERT INTO automation_executions(id, adapter_id, capability, status, external_id, external_url, output, error_message, started_at, finished_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET status=excluded.status, external_id=excluded.external_id,
      external_url=excluded.external_url, output=excluded.output, error_message=excluded.error_message, finished_at=excluded.finished_at
  `)
  return {
    list: () => (database.prepare('SELECT * FROM automation_executions ORDER BY started_at DESC').all() as Row[]).map(fromRow),
    find(id) {
      const row = database.prepare('SELECT * FROM automation_executions WHERE id = ?').get(id) as Row | undefined
      return row ? fromRow(row) : undefined
    },
    save(execution) {
      save.run(execution.id, execution.adapterId, execution.capability, execution.status, execution.externalId,
        execution.externalUrl, JSON.stringify(execution.output), execution.errorMessage, execution.startedAt, execution.finishedAt)
    },
    getControlState() {
      const row = database.prepare('SELECT emergency_stopped FROM automation_control WHERE id = 1').get() as { emergency_stopped: number }
      return { emergencyStopped: row.emergency_stopped === 1 }
    },
    setEmergencyStop(value) {
      database.prepare('UPDATE automation_control SET emergency_stopped = ? WHERE id = 1').run(value ? 1 : 0)
      return { emergencyStopped: value }
    },
  }
}
