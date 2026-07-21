import { randomUUID } from 'node:crypto'
import type { CreationRecordInput, CreationRecordQuery } from './creation-record.schema'
import type { CreationRecordRepository } from './creation-record.repository'

export class CreationRecordNotFoundError extends Error {}

export function createCreationRecordService(repository: CreationRecordRepository) {
  return {
    list: (query?: CreationRecordQuery) => repository.list(query),
    create(input: CreationRecordInput) {
      const timestamp = new Date().toISOString()
      const versionNumber = repository.nextVersion(input.productName, input.platform)
      return repository.create({ ...input, versionNumber, id: randomUUID(), createdAt: timestamp, updatedAt: timestamp })
    },
    update(id: string, input: CreationRecordInput) {
      const existing = repository.find(id)
      if (!existing) throw new CreationRecordNotFoundError('创作记录不存在')
      return repository.update({ ...input, versionNumber: existing.versionNumber, source: existing.source, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() })
    },
    remove(id: string) {
      if (!repository.remove(id)) throw new CreationRecordNotFoundError('创作记录不存在')
    },
  }
}
