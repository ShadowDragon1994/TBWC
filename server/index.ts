import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { createApp } from './app'
import { createDatabase } from './shared/database'

const port = Number(process.env.PORT ?? 3001)
const dataDir = resolve(process.env.DATA_DIR ?? 'data')
const database = createDatabase(resolve(dataDir, 'zaowutai.sqlite'))
const secretPath = resolve(dataDir, 'ai-secret.key')
let encryptionKey: Buffer
try { encryptionKey = readFileSync(secretPath) } catch { encryptionKey = randomBytes(32); writeFileSync(secretPath, encryptionKey, { mode: 0o600 }) }
const server = createApp({ database, uploadDir: resolve(dataDir, 'uploads'), encryptionKey }).listen(port, '127.0.0.1', () => {
  process.stdout.write(`${JSON.stringify({ level: 'info', message: 'server_started', port })}\n`)
})

function shutdown() {
  server.close(() => { database.close(); process.exit(0) })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
