import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { backupFilename, createDailyBackup, selectExpiredBackups } from './automatic-backup'

const directories: string[] = []
afterEach(() => directories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true })))

describe('automatic backup', () => {
  it('uses a stable Shanghai calendar date in the backup name', () => {
    expect(backupFilename(new Date('2026-07-24T16:30:00.000Z'))).toBe('zaowutai-auto-2026-07-25.zip')
  })

  it('only selects matching oldest backup files beyond retention', () => {
    const files = Array.from({ length: 32 }, (_, index) => `zaowutai-auto-2026-06-${String(index + 1).padStart(2, '0')}.zip`)
    expect(selectExpiredBackups([...files, 'notes.zip', 'zaowutai.sqlite'], 30)).toEqual(files.slice(0, 2))
  })

  it('writes one complete backup per day and skips a duplicate run', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'zaowutai-auto-backup-')); directories.push(directory)
    const fetchImpl = vi.fn().mockResolvedValue(new Response(Buffer.from('valid zip bytes'), { status: 200 }))
    const now = new Date('2026-07-25T03:00:00.000Z')

    await createDailyBackup({ backupDir: directory, baseUrl: 'http://127.0.0.1:3001', now, fetchImpl })
    await createDailyBackup({ backupDir: directory, baseUrl: 'http://127.0.0.1:3001', now, fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(readdirSync(directory)).toEqual(['zaowutai-auto-2026-07-25.zip'])
    writeFileSync(join(directory, 'unrelated.zip'), 'keep')
    expect(readdirSync(directory)).toContain('unrelated.zip')
  })
})
