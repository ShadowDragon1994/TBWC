import { randomUUID } from 'node:crypto'

export type AutomationCapability =
  | 'xiaohongshu.trends.collect'
  | 'xiaohongshu.publish'
  | 'xiaohongshu.customer-service.read'
  | 'xiaohongshu.customer-service.send'
  | 'photoshop.bridge'

export type AutomationJob = {
  id: string
  capability: AutomationCapability
  payload: Record<string, unknown>
}

export type AutomationAdapter = {
  id: string
  name: string
  capabilities: AutomationCapability[]
  execute(job: AutomationJob): Promise<{
    externalId?: string
    externalUrl?: string
    output: Record<string, unknown>
  }>
}

export type AutomationExecution = {
  id: string
  adapterId: string
  capability: AutomationCapability
  status: 'running' | 'succeeded' | 'failed'
  externalId: string
  externalUrl: string
  output: Record<string, unknown>
  errorMessage: string
  startedAt: string
  finishedAt: string | null
}

export class AutomationAdapterNotFoundError extends Error {}
export class UnsupportedAutomationCapabilityError extends Error {}
export class AutomationEmergencyStoppedError extends Error {}

export function createAutomationService({ adapters }: { adapters: AutomationAdapter[] }) {
  const executions: AutomationExecution[] = []
  let emergencyStopped = false

  return {
    getControlState() { return { emergencyStopped } },
    setEmergencyStop(value: boolean) { emergencyStopped = value; return { emergencyStopped } },
    listAdapters() {
      return adapters.map(({ id, name, capabilities }) => ({ id, name, capabilities }))
    },
    listExecutions() {
      return [...executions]
    },
    async execute(input: { adapterId: string; capability: AutomationCapability; payload: Record<string, unknown> }) {
      if (emergencyStopped) throw new AutomationEmergencyStoppedError('自动化已紧急停止，请恢复后再执行')
      const adapter = adapters.find(item => item.id === input.adapterId)
      if (!adapter) throw new AutomationAdapterNotFoundError(`自动化适配器不存在：${input.adapterId}`)
      if (!adapter.capabilities.includes(input.capability)) {
        throw new UnsupportedAutomationCapabilityError(`适配器不支持 ${input.capability}`)
      }

      const startedAt = new Date().toISOString()
      const execution: AutomationExecution = {
        id: randomUUID(),
        adapterId: adapter.id,
        capability: input.capability,
        status: 'running',
        externalId: '',
        externalUrl: '',
        output: {},
        errorMessage: '',
        startedAt,
        finishedAt: null,
      }
      executions.unshift(execution)

      try {
        const result = await adapter.execute({
          id: execution.id,
          capability: input.capability,
          payload: input.payload,
        })
        Object.assign(execution, {
          status: 'succeeded',
          externalId: result.externalId ?? '',
          externalUrl: result.externalUrl ?? '',
          output: result.output,
          finishedAt: new Date().toISOString(),
        })
        return { ...execution }
      } catch (error) {
        Object.assign(execution, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : '自动化执行失败',
          finishedAt: new Date().toISOString(),
        })
        throw error
      }
    },
  }
}
