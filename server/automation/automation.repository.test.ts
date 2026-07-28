import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../shared/database'
import { createAutomationRepository } from './automation.repository'
import { createAutomationService, type AutomationAdapter } from './automation.service'

describe('automation repository', () => {
  it('preserves audit and emergency stop state across service recreation', async () => {
    const database = createTestDatabase()
    const adapter: AutomationAdapter = {
      id: 'mock', name: '模拟', capabilities: ['photoshop.bridge'],
      execute: async () => ({ output: { accepted: true } }),
    }
    const first = createAutomationService({ adapters: [adapter], store: createAutomationRepository(database) })
    await first.execute({ adapterId: 'mock', capability: 'photoshop.bridge', payload: { secret: 'not-stored' } })
    first.setEmergencyStop(true)

    const second = createAutomationService({ adapters: [adapter], store: createAutomationRepository(database) })
    expect(second.getControlState()).toEqual({ emergencyStopped: true })
    expect(second.listExecutions()).toHaveLength(1)
    expect(JSON.stringify(second.listExecutions())).not.toContain('not-stored')
  })
})
