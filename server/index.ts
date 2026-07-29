import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { createApp } from './app'
import { startAutomaticBackup } from './backup/automatic-backup'
import { createDatabase } from './shared/database'

const port = Number(process.env.PORT ?? 3001)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须是 1 到 65535 之间的整数')
const dataDir = resolve(process.env.DATA_DIR ?? 'data')
const frontendDir = resolve(process.env.FRONTEND_DIR ?? 'dist')
const database = createDatabase(resolve(dataDir, 'zaowutai.sqlite'))
const secretPath = resolve(dataDir, 'ai-secret.key')
let encryptionKey: Buffer
try { encryptionKey = readFileSync(secretPath) } catch { encryptionKey = randomBytes(32); writeFileSync(secretPath, encryptionKey, { mode: 0o600 }) }
const server = createApp({
  database,
  uploadDir: resolve(dataDir, 'uploads'),
  frontendDir,
  encryptionKey,
  xiaohongshuMcpUrl: process.env.XHS_MCP_URL?.trim(),
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`${JSON.stringify({ level: 'info', message: 'server_started', port })}\n`)
  startAutomaticBackup({ backupDir: resolve(process.env.BACKUP_DIR ?? resolve(dataDir, 'backups')), baseUrl: `http://127.0.0.1:${port}` })
})

function shutdown() {
  server.close(() => { database.close(); process.exit(0) })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
