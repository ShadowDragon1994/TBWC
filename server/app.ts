import { mkdirSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import express, { type ErrorRequestHandler } from 'express'
import helmet from 'helmet'
import multer from 'multer'
import { ZodError } from 'zod'
import type { AppDatabase } from './shared/database'
import { createProductRepository } from './products/product.repository'
import { createProductService, ProductNotFoundError } from './products/product.service'
import { backupSchema, productInputSchema } from './products/product.schema'
import { createAssetRepository } from './products/asset.repository'
import { createBackupArchive, restoreBackupArchive } from './backup/backup.service'
import { createCreationRecordRepository } from './creation-records/creation-record.repository'
import { creationRecordInputSchema } from './creation-records/creation-record.schema'
import { createCreationRecordService, CreationRecordNotFoundError } from './creation-records/creation-record.service'
import { createAiSettingsRepository } from './ai/ai.repository'
import { aiGenerateInputSchema, aiSettingsInputSchema } from './ai/ai.schema'
import { createAiService, AiConfigurationError, AiUpstreamError } from './ai/ai.service'
import { createSecretService } from './ai/secret.service'

export function createApp({ database, uploadDir, encryptionKey = randomBytes(32), fetchImpl = fetch }: { database: AppDatabase; uploadDir: string; encryptionKey?: Buffer; fetchImpl?: typeof fetch }) {
  mkdirSync(uploadDir, { recursive: true })
  const app = express()
  const productService = createProductService(createProductRepository(database))
  const assetRepository = createAssetRepository(database)
  const creationRecordRepository = createCreationRecordRepository(database)
  const creationRecordService = createCreationRecordService(creationRecordRepository)
  const aiService = createAiService(createAiSettingsRepository(database), createSecretService(encryptionKey), fetchImpl)
  const upload = multer({
    storage: multer.diskStorage({ destination: uploadDir, filename: (_request, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`) }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_request, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
  })
  const backupUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024, files: 1 } })
  const backupDependencies = {
    uploadDir,
    listProducts: () => productService.list(),
    restoreProducts: (products: Parameters<typeof productService.restore>[0]) => productService.restore(products),
    listAssets: () => assetRepository.listAll(),
    restoreAssets: (assets: Parameters<typeof assetRepository.replaceAll>[0]) => assetRepository.replaceAll(assets),
    listCreationRecords: () => creationRecordRepository.list(),
    restoreCreationRecords: (records: Parameters<typeof creationRecordRepository.replaceAll>[0]) => creationRecordRepository.replaceAll(records),
  }

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(express.json({ limit: '2mb' }))
  app.use('/uploads', express.static(uploadDir, { fallthrough: false, maxAge: '1d' }))
  app.get('/health', (_request, response) => response.json({ status: 'ok' }))
  app.get('/ready', (_request, response) => response.json({ status: 'ok', database: 'ok' }))
  app.get('/api/products', (_request, response) => response.json({ data: productService.list().map(product => ({ ...product, assets: assetRepository.list(product.id) })) }))
  app.post('/api/products', (request, response) => response.status(201).json({ data: productService.create(productInputSchema.parse(request.body)) }))
  app.put('/api/products/:id', (request, response) => response.json({ data: productService.update(request.params.id, productInputSchema.parse(request.body)) }))
  app.delete('/api/products/:id', (request, response) => { productService.remove(request.params.id); response.status(204).end() })
  app.post('/api/products/:id/assets', upload.single('image'), (request, response) => {
    const productId = String(request.params.id)
    productService.find(productId)
    if (!request.file) return response.status(422).json({ code: 'VALIDATION_ERROR', message: '请选择 JPG、PNG 或 WebP 图片' })
    const asset = assetRepository.create({ productId, filename: request.file.originalname, storedName: request.file.filename, mimeType: request.file.mimetype, size: request.file.size })
    response.status(201).json({ data: { ...asset, url: `/uploads/${asset.storedName}` } })
  })
  app.get('/api/backup', (_request, response) => response.json({ version: 1, exportedAt: new Date().toISOString(), products: productService.list() }))
  app.post('/api/backup', (request, response) => response.json({ data: productService.restore(backupSchema.parse(request.body).products) }))
  app.get('/api/backup/archive', async (_request, response, next) => {
    try {
      const archive = await createBackupArchive(backupDependencies)
      response.setHeader('Content-Type', 'application/zip')
      response.setHeader('Content-Disposition', `attachment; filename="zaowutai-backup-${new Date().toISOString().slice(0, 10)}.zip"`)
      response.send(archive)
    } catch (error) { next(error) }
  })
  app.post('/api/backup/archive', backupUpload.single('backup'), async (request, response, next) => {
    try {
      if (!request.file) return response.status(422).json({ code: 'VALIDATION_ERROR', message: '请选择 ZIP 备份文件' })
      response.json({ data: await restoreBackupArchive(request.file.buffer, backupDependencies) })
    } catch (error) { next(error) }
  })
  app.get('/api/creation-records', (request, response) => response.json({ data: creationRecordService.list(String(request.query.q ?? '')) }))
  app.post('/api/creation-records', (request, response) => response.status(201).json({ data: creationRecordService.create(creationRecordInputSchema.parse(request.body)) }))
  app.put('/api/creation-records/:id', (request, response) => response.json({ data: creationRecordService.update(String(request.params.id), creationRecordInputSchema.parse(request.body)) }))
  app.delete('/api/creation-records/:id', (request, response) => { creationRecordService.remove(String(request.params.id)); response.status(204).end() })
  app.get('/api/ai/settings', (_request, response) => response.json({ data: aiService.getSettings() }))
  app.put('/api/ai/settings', (request, response) => response.json({ data: aiService.saveSettings(aiSettingsInputSchema.parse(request.body)) }))
  app.post('/api/ai/test', async (_request, response, next) => {
    try { response.json({ data: await aiService.testConnection() }) } catch (error) { next(error) }
  })
  app.post('/api/ai/generate', async (request, response, next) => {
    try { response.json({ data: await aiService.generate(aiGenerateInputSchema.parse(request.body)) }) } catch (error) { next(error) }
  })

  app.use((_request, response) => response.status(404).json({ code: 'NOT_FOUND', message: '接口不存在' }))
  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) return response.status(422).json({ code: 'VALIDATION_ERROR', message: '输入信息不完整或格式错误', fields: error.issues })
    if (error instanceof ProductNotFoundError) return response.status(404).json({ code: 'NOT_FOUND', message: error.message })
    if (error instanceof CreationRecordNotFoundError) return response.status(404).json({ code: 'NOT_FOUND', message: error.message })
    if (error instanceof AiConfigurationError) return response.status(422).json({ code: 'AI_CONFIGURATION_ERROR', message: error.message })
    if (error instanceof AiUpstreamError) return response.status(502).json({ code: 'AI_UPSTREAM_ERROR', message: error.message })
    if (error instanceof multer.MulterError) return response.status(422).json({ code: 'UPLOAD_ERROR', message: error.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 10MB' : '图片上传失败' })
    process.stderr.write(`${JSON.stringify({ level: 'error', message: error instanceof Error ? error.message : 'unknown error' })}\n`)
    response.status(500).json({ code: 'INTERNAL_ERROR', message: '服务暂时不可用' })
  }
  app.use(errorHandler)
  return app
}
