import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  it('exports and restores products together with their uploaded images', async () => {
    const uploadDir = mkdtempSync(join(tmpdir(), 'zaowutai-backup-'))
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir })
    const created = await request(app).post('/api/products').send({ name: '完整备份商品', category: '文创', price: 20 }).expect(201)
    const uploaded = await request(app)
      .post(`/api/products/${created.body.data.id}/assets`)
      .attach('image', Buffer.from('fake png bytes'), { filename: 'sample.png', contentType: 'image/png' })
      .expect(201)
    const savedCreation = await request(app).post('/api/creation-records').send({
      productId: created.body.data.id, productName: '完整备份商品', platform: '通用',
      title: '需要一起备份的文案', sellingPoints: ['卖点一'], body: '',
    }).expect(201)

    const archive = await request(app)
      .get('/api/backup/archive')
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = []
        response.on('data', chunk => chunks.push(Buffer.from(chunk)))
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })
      .expect('Content-Type', /application\/zip/)
      .expect(200)

    await request(app).delete(`/api/products/${created.body.data.id}`).expect(204)
    await request(app).delete(`/api/creation-records/${savedCreation.body.data.id}`).expect(204)
    rmSync(join(uploadDir, uploaded.body.data.storedName))
    await request(app).post('/api/backup/archive').attach('backup', archive.body, 'backup.zip').expect(200)

    const restored = await request(app).get('/api/products').expect(200)
    expect(restored.body.data[0]).toMatchObject({ name: '完整备份商品' })
    expect(restored.body.data[0].assets).toHaveLength(1)
    expect(existsSync(join(uploadDir, restored.body.data[0].assets[0].storedName))).toBe(true)
    await request(app).get('/api/creation-records').expect(200).expect(response => expect(response.body.data[0].title).toBe('需要一起备份的文案'))
    database.close()
    rmSync(uploadDir, { recursive: true, force: true })
  })
})

describe('creation record API', () => {
  it('creates, lists, updates and deletes a saved creation record', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const created = await request(app).post('/api/creation-records').send({
      productId: null,
      productName: '青瓷杯',
      platform: '小红书',
      title: '雨后青瓷，一杯东方清雅',
      sellingPoints: ['手工釉色', '温润触感', '日常好搭'],
      body: '适合放在书桌上的一只杯子。',
    }).expect(201)

    await request(app).get('/api/creation-records?q=青瓷').expect(200).expect(response => {
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].id).toBe(created.body.data.id)
    })
    await request(app).put(`/api/creation-records/${created.body.data.id}`).send({
      productId: null,
      productName: '青瓷杯',
      platform: '淘宝',
      title: '更新后的标题',
      sellingPoints: ['手工釉色'],
      body: '',
    }).expect(200).expect(response => expect(response.body.data.platform).toBe('淘宝'))
    await request(app).delete(`/api/creation-records/${created.body.data.id}`).expect(204)
    await request(app).get('/api/creation-records').expect(200).expect(response => expect(response.body.data).toEqual([]))
    database.close()
  })
})
