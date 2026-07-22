import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import JSZip from 'jszip'
import { z } from 'zod'
import type { ProductAsset } from '../products/asset.repository'
import type { Product } from '../products/product.types'
import { backupSchema } from '../products/product.schema'
import { creationRecordSchema, type CreationRecord } from '../creation-records/creation-record.schema'
import { publishingTaskSchema, type PublishingTask } from '../publishing-tasks/publishing-task.schema'

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
const assetSchema = z.object({
  id: z.string().uuid(), productId: z.string().uuid(), filename: z.string().min(1).max(255),
  storedName: z.string().regex(/^[0-9a-f-]{36}\.(?:jpe?g|png|webp)$/i),
  mimeType: z.enum(allowedMimeTypes), size: z.number().int().min(0).max(10 * 1024 * 1024), createdAt: z.string(),
})
const archiveManifestSchema = z.object({
  version: z.literal(2), exportedAt: z.string(),
  products: backupSchema.shape.products,
  assets: z.array(assetSchema).max(10000),
  creationRecords: z.array(creationRecordSchema).max(20000).default([]),
  publishingTasks: z.array(publishingTaskSchema).max(20000).default([]),
})

type BackupDependencies = {
  uploadDir: string
  listProducts: () => Product[]
  restoreProducts: (products: Product[]) => unknown
  listAssets: () => ProductAsset[]
  restoreAssets: (assets: ProductAsset[]) => void
  listCreationRecords: () => CreationRecord[]
  restoreCreationRecords: (records: CreationRecord[]) => void
  listPublishingTasks: () => PublishingTask[]
  restorePublishingTasks: (tasks: PublishingTask[]) => void
}

export async function createBackupArchive(dependencies: BackupDependencies) {
  const zip = new JSZip()
  const products = dependencies.listProducts()
  const assets = dependencies.listAssets()
  const creationRecords = dependencies.listCreationRecords()
  const publishingTasks = dependencies.listPublishingTasks()
  zip.file('manifest.json', JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), products, assets, creationRecords, publishingTasks }, null, 2))
  for (const asset of assets) {
    if (basename(asset.storedName) !== asset.storedName) throw new Error('备份中存在无效图片文件名')
    zip.file(`uploads/${asset.storedName}`, await readFile(join(dependencies.uploadDir, asset.storedName)))
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

export async function restoreBackupArchive(buffer: Buffer, dependencies: BackupDependencies) {
  const zip = await JSZip.loadAsync(buffer)
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('备份文件缺少 manifest.json')
  const manifest = archiveManifestSchema.parse(JSON.parse(await manifestFile.async('string')))
  const productIds = new Set(manifest.products.map(product => product.id))
  const extracted: Array<{ asset: ProductAsset; content: Buffer }> = []
  for (const asset of manifest.assets) {
    if (!productIds.has(asset.productId) || basename(asset.storedName) !== asset.storedName) throw new Error('备份中的图片信息无效')
    const entry = zip.file(`uploads/${asset.storedName}`)
    if (!entry) throw new Error(`备份缺少图片：${asset.filename}`)
    const content = await entry.async('nodebuffer')
    if (content.length !== asset.size) throw new Error(`图片大小校验失败：${asset.filename}`)
    extracted.push({ asset, content })
  }
  for (const item of extracted) await writeFile(join(dependencies.uploadDir, item.asset.storedName), item.content, { flag: 'w' })
  dependencies.restoreProducts(manifest.products)
  dependencies.restoreAssets(manifest.assets)
  dependencies.restoreCreationRecords(manifest.creationRecords)
  dependencies.restorePublishingTasks(manifest.publishingTasks)
  return { products: manifest.products.length, assets: manifest.assets.length, creationRecords: manifest.creationRecords.length, publishingTasks: manifest.publishingTasks.length }
}
