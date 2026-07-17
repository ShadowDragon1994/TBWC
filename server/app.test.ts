import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app'
import { createTestDatabase } from './shared/database'

describe('product API', () => {
  it('creates, lists, updates and deletes a product', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const created = await request(app).post('/api/products').send({ name: '测试商品', category: '文创', price: 39 }).expect(201)
    await request(app).get('/api/products').expect(200).expect(response => expect(response.body.data[0].id).toBe(created.body.data.id))
    await request(app).put(`/api/products/${created.body.data.id}`).send({ name: '修改后商品', category: '文创', price: 49 }).expect(200)
    await request(app).delete(`/api/products/${created.body.data.id}`).expect(204)
    database.close()
  })

  it('rejects invalid product input with a structured error', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const response = await request(app).post('/api/products').send({ name: '', price: -1 }).expect(422)
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' })
    database.close()
  })

  it('exports and restores product backup data', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).post('/api/products').send({ name: '备份商品', category: '文创', price: 20 }).expect(201)
    const backup = await request(app).get('/api/backup').expect(200)
    await request(app).delete(`/api/products/${backup.body.products[0].id}`).expect(204)
    await request(app).post('/api/backup').send(backup.body).expect(200)
    const restored = await request(app).get('/api/products').expect(200)
    expect(restored.body.data[0].name).toBe('备份商品')
    database.close()
  })
})
