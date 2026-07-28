import { mkdirSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { extname, resolve } from 'node:path'
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
import { creationRecordInputSchema, creationRecordQuerySchema, publicationInputSchema } from './creation-records/creation-record.schema'
import { createCreationRecordService, CreationRecordNotFoundError } from './creation-records/creation-record.service'
import { createAiSettingsRepository } from './ai/ai.repository'
import { aiGenerateInputSchema, aiSettingsInputSchema } from './ai/ai.schema'
import { createAiService, AiConfigurationError, AiUpstreamError } from './ai/ai.service'
import { createAiUsageRepository } from './ai/usage.repository'
import { createSecretService } from './ai/secret.service'
import { createPublishingTaskRepository } from './publishing-tasks/publishing-task.repository'
import { publishingTaskInputSchema, publishingTaskQuerySchema } from './publishing-tasks/publishing-task.schema'
import { createPublishingTaskService, PublishingTaskNotFoundError } from './publishing-tasks/publishing-task.service'
import { createPerformanceRecordRepository } from './performance-records/performance-record.repository'
import { performanceRecordImportSchema, performanceRecordInputSchema, performanceRecordQuerySchema } from './performance-records/performance-record.schema'
import { createPerformanceRecordService, PerformanceRecordNotFoundError } from './performance-records/performance-record.service'
import { createCreativeTaskRepository } from './creative-tasks/creative-task.repository'
import { creativeTaskInputSchema, creativeTaskQuerySchema } from './creative-tasks/creative-task.schema'
import { createCreativeTaskService, CreativeTaskNotFoundError, InvalidCreativeTaskTransitionError } from './creative-tasks/creative-task.service'
import { automationExecutionInputSchema } from './automation/automation.schema'
import { createMockAutomationAdapter } from './automation/mock.adapter'
import { AutomationAdapterNotFoundError, createAutomationService, UnsupportedAutomationCapabilityError } from './automation/automation.service'
import { analyzeOpportunities } from './opportunities/opportunity.service'
import { mockXiaohongshuTrends } from './opportunities/mock-trends'
import { customerIntentInputSchema } from './customer-service/intent.schema'
import { analyzeCustomerIntent, buildServiceReply } from './customer-service/intent.service'
import { buildFestivalPlan, calculateMape, festivalSeeds } from './festivals/festival.service'

export function createApp({ database, uploadDir, frontendDir, encryptionKey = randomBytes(32), fetchImpl = fetch }: { database: AppDatabase; uploadDir: string; frontendDir?: string; encryptionKey?: Buffer; fetchImpl?: typeof fetch }) {
  mkdirSync(uploadDir, { recursive: true })
  const app = express()
  const productService = createProductService(createProductRepository(database))
  const assetRepository = createAssetRepository(database)
  const creationRecordRepository = createCreationRecordRepository(database)
  const creationRecordService = createCreationRecordService(creationRecordRepository)
  const aiUsageRepository = createAiUsageRepository(database)
  const aiService = createAiService(createAiSettingsRepository(database), aiUsageRepository, createSecretService(encryptionKey), fetchImpl)
  const publishingTaskRepository = createPublishingTaskRepository(database)
  const publishingTaskService = createPublishingTaskService(publishingTaskRepository)
  const performanceRecordRepository = createPerformanceRecordRepository(database)
  const performanceRecordService = createPerformanceRecordService(performanceRecordRepository)
  const creativeTaskRepository = createCreativeTaskRepository(database)
  const creativeTaskService = createCreativeTaskService(creativeTaskRepository)
  const automationService = createAutomationService({ adapters: [createMockAutomationAdapter()] })
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
    listCreationRecords: () => creationRecordRepository.list({ q: '', productName: '', platform: '', source: '' }),
    restoreCreationRecords: (records: Parameters<typeof creationRecordRepository.replaceAll>[0]) => creationRecordRepository.replaceAll(records),
    listPublishingTasks: () => publishingTaskRepository.list({ platform: '', status: '', productName: '' }),
    restorePublishingTasks: (tasks: Parameters<typeof publishingTaskRepository.replaceAll>[0]) => publishingTaskRepository.replaceAll(tasks),
    listPerformanceRecords: () => performanceRecordRepository.list({ platform: '', productName: '' }),
    restorePerformanceRecords: (records: Parameters<typeof performanceRecordRepository.replaceAll>[0]) => performanceRecordRepository.replaceAll(records),
    listCreativeTasks: () => creativeTaskRepository.list({ status: '', platform: '' }),
    restoreCreativeTasks: (tasks: Parameters<typeof creativeTaskRepository.replaceAll>[0]) => creativeTaskRepository.replaceAll(tasks),
    listAiUsageRecords: () => aiUsageRepository.list(100000),
    restoreAiUsageRecords: (records: Parameters<typeof aiUsageRepository.replaceAll>[0]) => aiUsageRepository.replaceAll(records),
  }

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(express.json({ limit: '2mb' }))
  app.use('/uploads', express.static(uploadDir, { fallthrough: false, maxAge: '1d' }))
  app.get('/health', (_request, response) => response.json({ status: 'ok' }))
  app.get('/ready', (_request, response) => response.json({ status: 'ok', database: 'ok', application: 'zaowutai' }))
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
  app.get('/api/creation-records', (request, response) => response.json({ data: creationRecordService.list(creationRecordQuerySchema.parse(request.query)) }))
  app.post('/api/creation-records', (request, response) => response.status(201).json({ data: creationRecordService.create(creationRecordInputSchema.parse(request.body)) }))
  app.put('/api/creation-records/:id', (request, response) => response.json({ data: creationRecordService.update(String(request.params.id), creationRecordInputSchema.parse(request.body)) }))
  app.delete('/api/creation-records/:id', (request, response) => { creationRecordService.remove(String(request.params.id)); response.status(204).end() })
  app.patch('/api/creation-records/:id/publication', (request, response) => response.json({ data: creationRecordService.updatePublication(String(request.params.id), publicationInputSchema.parse(request.body)) }))
  app.get('/api/publishing-tasks', (request, response) => response.json({ data: publishingTaskService.list(publishingTaskQuerySchema.parse(request.query)) }))
  app.post('/api/publishing-tasks', (request, response) => response.status(201).json({ data: publishingTaskService.create(publishingTaskInputSchema.parse(request.body)) }))
  app.put('/api/publishing-tasks/:id', (request, response) => response.json({ data: publishingTaskService.update(String(request.params.id), publishingTaskInputSchema.parse(request.body)) }))
  app.delete('/api/publishing-tasks/:id', (request, response) => { publishingTaskService.remove(String(request.params.id)); response.status(204).end() })
  app.get('/api/creative-tasks', (request, response) => response.json({ data: creativeTaskService.list(creativeTaskQuerySchema.parse(request.query)) }))
  app.get('/api/creative-tasks/:id', (request, response) => response.json({ data: creativeTaskService.find(String(request.params.id)) }))
  app.post('/api/creative-tasks', (request, response) => response.status(201).json({ data: creativeTaskService.create(creativeTaskInputSchema.parse(request.body)) }))
  app.put('/api/creative-tasks/:id', (request, response) => response.json({ data: creativeTaskService.update(String(request.params.id), creativeTaskInputSchema.parse(request.body)) }))
  app.get('/api/performance-records', (request, response) => response.json({ data: performanceRecordService.list(performanceRecordQuerySchema.parse(request.query)) }))
  app.post('/api/performance-records', (request, response) => response.status(201).json({ data: performanceRecordService.create(performanceRecordInputSchema.parse(request.body)) }))
  app.post('/api/performance-records/import', (request, response) => response.json({ data: performanceRecordService.importMany(performanceRecordImportSchema.parse(request.body).records) }))
  app.put('/api/performance-records/:id', (request, response) => response.json({ data: performanceRecordService.update(String(request.params.id), performanceRecordInputSchema.parse(request.body)) }))
  app.delete('/api/performance-records/:id', (request, response) => { performanceRecordService.remove(String(request.params.id)); response.status(204).end() })
  app.get('/api/ai/settings', (_request, response) => response.json({ data: aiService.getSettings() }))
  app.get('/api/ai/usage', (_request, response) => response.json({ data: aiService.getUsage() }))
  app.put('/api/ai/settings', (request, response) => response.json({ data: aiService.saveSettings(aiSettingsInputSchema.parse(request.body)) }))
  app.post('/api/ai/test', async (_request, response, next) => {
    try { response.json({ data: await aiService.testConnection() }) } catch (error) { next(error) }
  })
  app.post('/api/ai/generate', async (request, response, next) => {
    try { response.json({ data: await aiService.generate(aiGenerateInputSchema.parse(request.body)) }) } catch (error) { next(error) }
  })
  app.get('/api/automation/adapters', (_request, response) => response.json({ data: automationService.listAdapters() }))
  app.get('/api/automation/executions', (_request, response) => response.json({ data: automationService.listExecutions() }))
  app.post('/api/automation/executions', async (request, response, next) => {
    try { response.status(201).json({ data: await automationService.execute(automationExecutionInputSchema.parse(request.body)) }) } catch (error) { next(error) }
  })
  app.get('/api/opportunities', (_request, response) => response.json({
    data: analyzeOpportunities(mockXiaohongshuTrends),
    meta: { platform: '小红书', source: 'mock', simulated: true, collectedAt: new Date().toISOString() },
  }))
  app.post('/api/customer-service/analyze', (request, response) => {
    const { message } = customerIntentInputSchema.parse(request.body)
    const intent = analyzeCustomerIntent(message)
    response.json({ data: { intent, reply: buildServiceReply(intent) } })
  })
  app.get('/api/festivals', (_request, response) => response.json({
    data: buildFestivalPlan(new Date(), festivalSeeds),
    backtest: { mape: calculateMape([{ predicted: 10200, actual: 11000 }, { predicted: 15400, actual: 14500 }, { predicted: 8800, actual: 9200 }]), samples: 3 },
    meta: { source: 'mock', simulated: true, method: '历史基线 × 节日提升系数', generatedAt: new Date().toISOString() },
  }))

  if (frontendDir) {
    app.use(express.static(frontendDir, { index: 'index.html', maxAge: '1h' }))
    app.get('/{*path}', (request, response, next) => request.path.startsWith('/api/') ? next() : response.sendFile(resolve(frontendDir, 'index.html')))
  }
  app.use((_request, response) => response.status(404).json({ code: 'NOT_FOUND', message: '接口不存在' }))
  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) return response.status(422).json({ code: 'VALIDATION_ERROR', message: '输入信息不完整或格式错误', fields: error.issues })
    if (error instanceof ProductNotFoundError) return response.status(404).json({ code: 'NOT_FOUND', message: error.message })
    if (error instanceof CreationRecordNotFoundError) return response.status(404).json({ code: 'NOT_FOUND', message: error.message })
    if (error instanceof PublishingTaskNotFoundError) return response.status(404).json({ code: 'NOT_FOUND', message: error.message })
    if (error instanceof PerformanceRecordNotFoundError) return response.status(404).json({ code: 'NOT_FOUND', message: error.message })
    if (error instanceof CreativeTaskNotFoundError) return response.status(404).json({ code: 'NOT_FOUND', message: error.message })
    if (error instanceof InvalidCreativeTaskTransitionError) return response.status(409).json({ code: 'INVALID_TASK_TRANSITION', message: error.message })
    if (error instanceof AiConfigurationError) return response.status(422).json({ code: 'AI_CONFIGURATION_ERROR', message: error.message })
    if (error instanceof AiUpstreamError) return response.status(502).json({ code: 'AI_UPSTREAM_ERROR', message: error.message })
    if (error instanceof AutomationAdapterNotFoundError) return response.status(404).json({ code: 'AUTOMATION_ADAPTER_NOT_FOUND', message: error.message })
    if (error instanceof UnsupportedAutomationCapabilityError) return response.status(422).json({ code: 'UNSUPPORTED_AUTOMATION_CAPABILITY', message: error.message })
    if (error instanceof multer.MulterError) return response.status(422).json({ code: 'UPLOAD_ERROR', message: error.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 10MB' : '图片上传失败' })
    process.stderr.write(`${JSON.stringify({ level: 'error', message: error instanceof Error ? error.message : 'unknown error' })}\n`)
    response.status(500).json({ code: 'INTERNAL_ERROR', message: '服务暂时不可用' })
  }
  app.use(errorHandler)
  return app
}
