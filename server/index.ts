import { resolve } from 'node:path'
import { createApp } from './app'
import { createDatabase } from './shared/database'

const port = Number(process.env.PORT ?? 3001)
const dataDir = resolve(process.env.DATA_DIR ?? 'data')
const database = createDatabase(resolve(dataDir, 'zaowutai.sqlite'))
const server = createApp({ database, uploadDir: resolve(dataDir, 'uploads') }).listen(port, '127.0.0.1', () => {
  process.stdout.write(`${JSON.stringify({ level: 'info', message: 'server_started', port })}\n`)
})

function shutdown() {
  server.close(() => { database.close(); process.exit(0) })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
