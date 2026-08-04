import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../shared/database'
import { createOpportunityKeywordRepository } from './opportunity-keyword.repository'

describe('opportunity keyword repository', () => {
  it('keeps the configured list unchanged after reopening the database', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'zaowutai-keywords-')), 'data.sqlite')
    const firstDatabase = createDatabase(path)
    createOpportunityKeywordRepository(firstDatabase).replace(['七夕礼物', '新中式香薰'])
    firstDatabase.close()

    const reopenedDatabase = createDatabase(path)
    expect(createOpportunityKeywordRepository(reopenedDatabase).list()).toEqual(['七夕礼物', '新中式香薰'])
    reopenedDatabase.close()
  })
})
