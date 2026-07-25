import { randomUUID } from 'node:crypto'
import type { CreativeTaskInput, CreativeTaskQuery, CreativeTaskStatus } from './creative-task.schema'
import type { createCreativeTaskRepository } from './creative-task.repository'

export class CreativeTaskNotFoundError extends Error {}
export class InvalidCreativeTaskTransitionError extends Error {}

const nextStatuses: Record<CreativeTaskStatus, CreativeTaskStatus[]> = {
  draft: ['editing', 'failed'],
  editing: ['checking', 'failed'],
  checking: ['editing', 'confirming', 'failed'],
  confirming: ['editing', 'exporting', 'failed'],
  exporting: ['completed', 'failed'],
  completed: [],
  failed: ['editing'],
}

export function createCreativeTaskService(repository: ReturnType<typeof createCreativeTaskRepository>) {
  return {
    list: (query: CreativeTaskQuery) => repository.list(query),
    find(id: string) {
      const task = repository.find(id)
      if (!task) throw new CreativeTaskNotFoundError('创作任务不存在')
      return task
    },
    create(input: CreativeTaskInput) {
      const now = new Date().toISOString()
      return repository.save({ ...input, id: randomUUID(), createdAt: now, updatedAt: now })
    },
    update(id: string, input: CreativeTaskInput) {
      const current = this.find(id)
      if (input.status !== current.status && !nextStatuses[current.status].includes(input.status)) {
        throw new InvalidCreativeTaskTransitionError(`不能从 ${current.status} 直接进入 ${input.status}`)
      }
      return repository.save({ ...current, ...input, failureReason: input.status === 'failed' ? input.failureReason : '', updatedAt: new Date().toISOString() })
    },
  }
}

