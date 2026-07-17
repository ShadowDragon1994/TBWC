import { randomUUID } from 'node:crypto'
import type { ProductRepository } from './product.repository'
import type { ProductInput } from './product.types'
import type { Product } from './product.types'

export class ProductNotFoundError extends Error {}

export function createProductService(repository: ProductRepository) {
  return {
    create(input: ProductInput) {
      const now = new Date().toISOString()
      return repository.create({ ...input, id: randomUUID(), createdAt: now, updatedAt: now })
    },
    list: repository.list,
    find(id: string) {
      const product = repository.find(id)
      if (!product) throw new ProductNotFoundError('商品不存在')
      return product
    },
    update(id: string, input: ProductInput) {
      if (!repository.find(id)) throw new ProductNotFoundError('商品不存在')
      return repository.update(id, input, new Date().toISOString())!
    },
    remove(id: string) {
      if (!repository.remove(id)) throw new ProductNotFoundError('商品不存在')
    },
    restore(products: Product[]) {
      repository.replaceAll(products)
      return repository.list()
    },
  }
}
