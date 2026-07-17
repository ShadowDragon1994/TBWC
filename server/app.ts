import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
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

export function createApp({ database, uploadDir }: { database: AppDatabase; uploadDir: string }) {
  mkdirSync(uploadDir, { recursive: true })
  const app = express()
  const productService = createProductService(createProductRepository(database))
  const assetRepository = createAssetRepository(database)
  const upload = multer({
    storage: multer.diskStorage({ destination: uploadDir, filename: (_request, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`) }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_request, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
  })

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

  app.use((_request, response) => response.status(404).json({ code: 'NOT_FOUND', message: '接口不存在' }))
  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) return response.status(422).json({ code: 'VALIDATION_ERROR', message: '输入信息不完整或格式错误', fields: error.issues })
    if (error instanceof ProductNotFoundError) return response.status(404).json({ code: 'NOT_FOUND', message: error.message })
    if (error instanceof multer.MulterError) return response.status(422).json({ code: 'UPLOAD_ERROR', message: error.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 10MB' : '图片上传失败' })
    process.stderr.write(`${JSON.stringify({ level: 'error', message: error instanceof Error ? error.message : 'unknown error' })}\n`)
    response.status(500).json({ code: 'INTERNAL_ERROR', message: '服务暂时不可用' })
  }
  app.use(errorHandler)
  return app
}
