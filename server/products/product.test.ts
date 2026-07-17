import { afterEach, describe, expect, it } from 'vitest'
import { createProductRepository } from './product.repository'
import { createProductService } from './product.service'
import { createTestDatabase } from '../shared/database'

const databases: ReturnType<typeof createTestDatabase>[] = []
afterEach(() => databases.splice(0).forEach(database => database.close()))

describe('product service', () => {
  it('creates and lists a product in SQLite', () => {
    const database = createTestDatabase(); databases.push(database)
    const service = createProductService(createProductRepository(database))
    const product = service.create({ name: '花窗书签', category: '文创', price: 59, material: '胡桃木', audience: '阅读爱好者', scene: '赠礼' })
    expect(service.list()).toEqual([expect.objectContaining({ id: product.id, name: '花窗书签' })])
  })

  it('updates a product and keeps the same id', () => {
    const database = createTestDatabase(); databases.push(database)
    const service = createProductService(createProductRepository(database))
    const created = service.create({ name: '旧名称', category: '文创', price: 59 })
    const updated = service.update(created.id, { ...created, name: '新名称', price: 69 })
    expect(updated).toMatchObject({ id: created.id, name: '新名称', price: 69 })
  })

  it('deletes a product', () => {
    const database = createTestDatabase(); databases.push(database)
    const service = createProductService(createProductRepository(database))
    const created = service.create({ name: '待删除商品', category: '文创', price: 10 })
    service.remove(created.id)
    expect(service.list()).toHaveLength(0)
  })
})
