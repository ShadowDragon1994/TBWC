import { randomUUID } from 'node:crypto'
import type { PublishingTaskInput, PublishingTaskQuery } from './publishing-task.schema'
import type { createPublishingTaskRepository } from './publishing-task.repository'

export class PublishingTaskNotFoundError extends Error {}

export function createPublishingTaskService(repository: ReturnType<typeof createPublishingTaskRepository>) {
  return {
    list: (query: PublishingTaskQuery) => repository.list(query),
    create(input: PublishingTaskInput) {
      const now = new Date().toISOString()
      return repository.save({ ...input, id: randomUUID(), actualPublishedAt: input.status === 'published' ? now : null, createdAt: now, updatedAt: now })
    },
    update(id: string, input: PublishingTaskInput) {
      const current = repository.find(id)
      if (!current) throw new PublishingTaskNotFoundError('发布任务不存在')
      const actualPublishedAt = input.status === 'published' ? current.actualPublishedAt ?? new Date().toISOString() : null
      return repository.save({ ...current, ...input, actualPublishedAt, updatedAt: new Date().toISOString() })
    },
    remove(id: string) {
      if (!repository.remove(id)) throw new PublishingTaskNotFoundError('发布任务不存在')
    },
  }
}
