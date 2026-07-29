import { randomUUID } from 'node:crypto'

export type AutomationCapability =
  | 'xiaohongshu.trends.collect'
  | 'xiaohongshu.publish'
  | 'xiaohongshu.customer-service.read'
  | 'xiaohongshu.customer-service.send'
  | 'supply.1688.collect'
  | 'taobao.product.list'
  | 'photoshop.bridge'

export type AutomationJob = { id: string; capability: AutomationCapability; payload: Record<string, unknown> }
export type AutomationAdapter = {
  id: string
  name: string
  capabilities: AutomationCapability[]
  execute(job: AutomationJob): Promise<{ externalId?: string; externalUrl?: string; output: Record<string, unknown> }>
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
export type AutomationStore = {
  list(): AutomationExecution[]
  find(id: string): AutomationExecution | undefined
  save(execution: AutomationExecution): void
  getControlState(): { emergencyStopped: boolean }
  setEmergencyStop(value: boolean): { emergencyStopped: boolean }
}

export class AutomationAdapterNotFoundError extends Error {}
export class UnsupportedAutomationCapabilityError extends Error {}
export class AutomationEmergencyStoppedError extends Error {}
export class AutomationExecutionNotRetryableError extends Error {}

function createMemoryAutomationStore(): AutomationStore {
  const executions: AutomationExecution[] = []
  let emergencyStopped = false
  return {
    list: () => [...executions],
    find: id => executions.find(execution => execution.id === id),
    save(execution) {
      const index = executions.findIndex(item => item.id === execution.id)
      if (index === -1) executions.unshift({ ...execution })
      else executions[index] = { ...execution }
    },
    getControlState: () => ({ emergencyStopped }),
    setEmergencyStop(value) { emergencyStopped = value; return { emergencyStopped } },
  }
}

export function createAutomationService({ adapters, store = createMemoryAutomationStore() }: { adapters: AutomationAdapter[]; store?: AutomationStore }) {
  async function execute(input: { adapterId: string; capability: AutomationCapability; payload: Record<string, unknown> }) {
    if (store.getControlState().emergencyStopped) throw new AutomationEmergencyStoppedError('自动化已紧急停止，请恢复后再执行')
    const adapter = adapters.find(item => item.id === input.adapterId)
    if (!adapter) throw new AutomationAdapterNotFoundError(`自动化适配器不存在：${input.adapterId}`)
    if (!adapter.capabilities.includes(input.capability)) throw new UnsupportedAutomationCapabilityError(`适配器不支持 ${input.capability}`)

    const execution: AutomationExecution = {
      id: randomUUID(), adapterId: adapter.id, capability: input.capability, status: 'running',
      externalId: '', externalUrl: '', output: {}, errorMessage: '',
      startedAt: new Date().toISOString(), finishedAt: null,
    }
    store.save(execution)
    try {
      const result = await adapter.execute({ id: execution.id, capability: input.capability, payload: input.payload })
      Object.assign(execution, {
        status: 'succeeded', externalId: result.externalId ?? '', externalUrl: result.externalUrl ?? '',
        output: result.output, finishedAt: new Date().toISOString(),
      })
      store.save(execution)
      return { ...execution }
    } catch (error) {
      Object.assign(execution, {
        status: 'failed', errorMessage: error instanceof Error ? error.message : '自动化执行失败',
        finishedAt: new Date().toISOString(),
      })
      store.save(execution)
      throw error
    }
  }

  return {
    getControlState: store.getControlState,
    setEmergencyStop: store.setEmergencyStop,
    listAdapters: () => adapters.map(({ id, name, capabilities }) => ({ id, name, capabilities })),
    listExecutions: store.list,
    execute,
    retry(id: string, payload: Record<string, unknown>) {
      const previous = store.find(id)
      if (!previous || previous.status !== 'failed') throw new AutomationExecutionNotRetryableError('仅可重试已失败的自动化任务')
      return execute({ adapterId: previous.adapterId, capability: previous.capability, payload })
    },
  }
}
