import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const backupPattern = /^zaowutai-auto-\d{4}-\d{2}-\d{2}\.zip$/

export function backupFilename(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value
  return `zaowutai-auto-${value('year')}-${value('month')}-${value('day')}.zip`
}

export function selectExpiredBackups(files: string[], keep = 30) {
  return files.filter(file => backupPattern.test(file)).sort().slice(0, -Math.max(keep, 1))
}

export async function createDailyBackup({
  backupDir, baseUrl, now = new Date(), keep = 30, fetchImpl = fetch,
}: {
  backupDir: string; baseUrl: string; now?: Date; keep?: number; fetchImpl?: typeof fetch
}) {
  mkdirSync(backupDir, { recursive: true })
  const filename = backupFilename(now)
  const destination = join(backupDir, filename)
  if (!existsSync(destination)) {
    const response = await fetchImpl(`${baseUrl}/api/backup/archive`)
    if (!response.ok) throw new Error(`自动备份请求失败：HTTP ${response.status}`)
    const content = Buffer.from(await response.arrayBuffer())
    if (!content.length) throw new Error('自动备份内容为空')
    const temporary = join(backupDir, `${filename}.${process.pid}.tmp`)
    try {
      writeFileSync(temporary, content, { flag: 'wx' })
      renameSync(temporary, destination)
    } catch (error) {
      rmSync(temporary, { force: true })
      throw error
    }
  }
  for (const expired of selectExpiredBackups(readdirSync(backupDir), keep)) unlinkSync(join(backupDir, expired))
  return destination
}

export function startAutomaticBackup(options: { backupDir: string; baseUrl: string; keep?: number; intervalMs?: number }) {
  const run = () => createDailyBackup(options).then(
    path => process.stdout.write(`${JSON.stringify({ level: 'info', message: 'automatic_backup_ready', path })}\n`),
    error => process.stderr.write(`${JSON.stringify({ level: 'error', message: 'automatic_backup_failed', error: error instanceof Error ? error.message : String(error) })}\n`),
  )
  void run()
  const timer = setInterval(run, options.intervalMs ?? 60 * 60 * 1000)
  timer.unref()
  return timer
}
