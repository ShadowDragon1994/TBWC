import { randomUUID } from 'node:crypto'
import type { AppDatabase } from '../shared/database'

export type ProductAsset = { id: string; productId: string; filename: string; storedName: string; mimeType: string; size: number; createdAt: string }

export function createAssetRepository(database: AppDatabase) {
  const insert = database.prepare('INSERT INTO product_assets (id,product_id,filename,stored_name,mime_type,size,created_at) VALUES (?,?,?,?,?,?,?)')
  const list = database.prepare('SELECT id,product_id as productId,filename,stored_name as storedName,mime_type as mimeType,size,created_at as createdAt FROM product_assets WHERE product_id=? ORDER BY created_at')
  return {
    create(input: Omit<ProductAsset, 'id' | 'createdAt'>) {
      const asset = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }
      insert.run(asset.id, asset.productId, asset.filename, asset.storedName, asset.mimeType, asset.size, asset.createdAt)
      return asset
    },
    list: (productId: string) => list.all(productId) as ProductAsset[],
  }
}
