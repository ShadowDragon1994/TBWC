import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from './app'
import { createTestDatabase } from './shared/database'

describe('inventory and competitor API', () => {
  it('returns clearance strategies and competitor events from labelled mock data', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).get('/api/inventory-intelligence').expect(200).expect(response => {
      expect(response.body.meta).toMatchObject({ source: 'mock', simulated: true })
      expect(response.body.inventory).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'clearance', suggestedPrice: expect.any(Number) })]))
      expect(response.body.competitors).toEqual(expect.arrayContaining([expect.objectContaining({ event: 'new_product' }), expect.objectContaining({ event: 'price_drop' })]))
    })
    database.close()
  })
})

describe('festival planning API', () => {
  it('returns source-labelled forecasts, reminder milestones and backtest error', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).get('/api/festivals').expect(200).expect(response => {
      expect(response.body.meta).toMatchObject({ source: 'mock', simulated: true })
      expect(response.body.data[0]).toMatchObject({
        name: expect.any(String),
        predictedViews: expect.any(Number),
        predictionInterval: { low: expect.any(Number), high: expect.any(Number) },
        milestones: expect.any(Array),
      })
      expect(response.body.backtest.mape).toBeLessThanOrEqual(20)
    })
    database.close()
  })
})

describe('customer service assistant API', () => {
  it('analyzes gift intent and returns a bounded suggested reply', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).post('/api/customer-service/analyze').send({
      message: '送给老师，教师节前到北京，预算100以内',
    }).expect(200).expect(response => {
      expect(response.body.data.intent).toMatchObject({ purpose: 'gift', recipient: '老师', holiday: '教师节', budgetMax: 100 })
      expect(response.body.data.reply).toContain('需要根据收货地区和下单时间确认')
    })
    database.close()
  })
})

describe('Xiaohongshu opportunity API', () => {
  it('persists page-configurable seed keywords and uses them for opportunity collection', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })

    await request(app).put('/api/opportunity-keywords').send({ keywords: ['七夕礼物', '新中式香薰', '七夕礼物'] }).expect(200).expect(response => {
      expect(response.body.data).toEqual(['七夕礼物', '新中式香薰'])
    })
    await request(app).get('/api/opportunity-keywords').expect(200).expect(response => {
      expect(response.body.data).toEqual(['七夕礼物', '新中式香薰'])
    })
    await request(app).get('/api/opportunities').expect(200).expect(response => {
      expect(response.body.data.map((item: { keyword: string }) => item.keyword).sort()).toEqual(['七夕礼物', '新中式香薰'].sort())
    })
    database.close()
  })

  it('returns explainable blue-ocean scores from the simulated trend source', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).get('/api/opportunities').expect(200).expect(response => {
      expect(response.body.meta).toMatchObject({ platform: '小红书', source: 'mock', simulated: true })
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(response.body.data[0]).toMatchObject({
        keyword: expect.any(String),
        score: expect.any(Number),
        scoreBreakdown: {
          demandSupply: expect.any(Number),
          growth: expect.any(Number),
          engagement: expect.any(Number),
          competition: expect.any(Number),
        },
      })
    })
    await request(app).get('/api/opportunities').expect(200).expect(response => {
      expect(response.body.meta.cached).toBe(true)
    })
    await request(app).get('/api/opportunities?refresh=true').expect(200).expect(response => {
      expect(response.body.meta.cached).toBe(false)
    })
    database.close()
  })
})

describe('automation bridge API', () => {
  it('lists adapter capabilities and executes an auditable simulated Xiaohongshu publish job', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })

    await request(app).get('/api/automation/adapters').expect(200).expect(response => {
      expect(response.body.data[0]).toMatchObject({
        id: 'mock',
        capabilities: expect.arrayContaining(['xiaohongshu.publish', 'photoshop.bridge']),
      })
    })

    const executed = await request(app).post('/api/automation/executions').send({
      adapterId: 'mock',
      capability: 'xiaohongshu.publish',
      payload: { title: '青瓷杯', body: '一只温润的杯子', assets: [] },
    }).expect(201)
    expect(executed.body.data).toMatchObject({
      adapterId: 'mock',
      capability: 'xiaohongshu.publish',
      status: 'succeeded',
      externalUrl: expect.stringMatching(/^https:\/\/www\.xiaohongshu\.com\//),
    })

    await request(app).get('/api/automation/executions').expect(200).expect(response => {
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].id).toBe(executed.body.data.id)
    })
    database.close()
  })

  it('rejects arbitrary automation capabilities', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).post('/api/automation/executions').send({
      adapterId: 'mock',
      capability: 'shell.delete-files',
      payload: {},
    }).expect(422)
    database.close()
  })

  it('blocks execution after emergency stop and resumes explicitly', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).put('/api/automation/control').send({ emergencyStopped: true }).expect(200)
    await request(app).post('/api/automation/executions').send({ adapterId: 'mock', capability: 'photoshop.bridge', payload: {} }).expect(423)
    await request(app).put('/api/automation/control').send({ emergencyStopped: false }).expect(200)
    await request(app).post('/api/automation/executions').send({ adapterId: 'mock', capability: 'photoshop.bridge', payload: {} }).expect(201)
    database.close()
  })
})

describe('creative task API', () => {
  it('creates, resumes and advances a persisted creative task', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const input = {
      productId: null,
      productName: '青瓷杯',
      platform: '小红书',
      title: '雨后青瓷',
      sellingPoints: ['釉色自然', '日常茶饮'],
      body: '一只适合日常使用的青瓷杯。',
      status: 'draft',
      failureReason: '',
    }
    const created = await request(app).post('/api/creative-tasks').send(input).expect(201)

    await request(app).get('/api/creative-tasks?status=draft').expect(200).expect(response => {
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({ id: created.body.data.id, productName: '青瓷杯' })
    })
    await request(app).get(`/api/creative-tasks/${created.body.data.id}`).expect(200)
    await request(app).put(`/api/creative-tasks/${created.body.data.id}`).send({
      ...input,
      status: 'editing',
      title: '雨后青瓷｜日常茶席',
    }).expect(200).expect(response => {
      expect(response.body.data).toMatchObject({ status: 'editing', title: '雨后青瓷｜日常茶席' })
    })
    database.close()
  })

  it('rejects invalid creative task state transitions', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const input = { productId: null, productName: '木梳', platform: '抖音', title: '木梳', sellingPoints: [], body: '正文', status: 'draft', failureReason: '' }
    const created = await request(app).post('/api/creative-tasks').send(input).expect(201)
    await request(app).put(`/api/creative-tasks/${created.body.data.id}`).send({ ...input, status: 'completed' }).expect(409)
    database.close()
  })
})

describe('production frontend hosting', () => {
  it('identifies the local application in readiness checks', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).get('/ready').expect(200).expect(response => {
      expect(response.body).toEqual({ status: 'ok', database: 'ok', application: 'zaowutai' })
    })
    database.close()
  })

  it('serves the built app for browser routes while preserving API 404 responses', async () => {
    const frontendDir = mkdtempSync(join(tmpdir(), 'zaowutai-frontend-'))
    writeFileSync(join(frontendDir, 'index.html'), '<!doctype html><title>造物台生产页</title>')
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', frontendDir })

    await request(app).get('/strategy').expect('Content-Type', /html/).expect(200).expect(/造物台生产页/)
    await request(app).get('/api/does-not-exist').expect('Content-Type', /json/).expect(404)

    database.close()
    rmSync(frontendDir, { recursive: true, force: true })
  })
})

describe('publishing task API', () => {
  it('creates, filters, publishes and deletes a publishing task', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const created = await request(app).post('/api/publishing-tasks').send({
      productId: null,
      creationRecordId: null,
      productName: '青瓷杯',
      platform: '小红书',
      title: '雨后青瓷发布任务',
      plannedAt: '2026-07-23T02:00:00.000Z',
      notes: '首图使用留白版',
      status: 'editing',
      publishedUrl: '',
    }).expect(201)

    await request(app).get('/api/publishing-tasks?platform=小红书&productName=青瓷').expect(200).expect(response => {
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({ id: created.body.data.id, status: 'editing' })
    })

    const published = await request(app).put(`/api/publishing-tasks/${created.body.data.id}`).send({
      ...created.body.data,
      status: 'published',
      publishedUrl: 'https://www.xiaohongshu.com/explore/example',
    }).expect(200)
    expect(published.body.data.actualPublishedAt).toEqual(expect.any(String))

    await request(app).delete(`/api/publishing-tasks/${created.body.data.id}`).expect(204)
    await request(app).get('/api/publishing-tasks').expect(200).expect(response => expect(response.body.data).toEqual([]))
    database.close()
  })

  it('automatically publishes a ready Xiaohongshu task and persists its audit', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const created = await request(app).post('/api/publishing-tasks').send({
      productId: null, creationRecordId: null, productName: '青瓷杯', platform: '小红书',
      title: '自动发布任务', plannedAt: '2026-07-23T02:00:00.000Z',
      notes: '发布正文', status: 'ready', publishedUrl: '',
    }).expect(201)

    const published = await request(app).post(`/api/publishing-tasks/${created.body.data.id}/auto-publish`).expect(201)
    expect(published.body.data.task).toMatchObject({ status: 'published' })
    expect(published.body.data.task.publishedUrl).toMatch(/^https:\/\/www\.xiaohongshu\.com/)
    await request(app).get('/api/automation/executions').expect(200).expect(response => {
      expect(response.body.data[0]).toMatchObject({ capability: 'xiaohongshu.publish', status: 'succeeded' })
    })
    database.close()
  })

  it('uses the configured Xiaohongshu MCP adapter with local product images and product binding', async () => {
    const database = createTestDatabase()
    const mcpFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-03-26', capabilities: {}, serverInfo: {} } }), { status: 200, headers: { 'Content-Type': 'application/json', 'mcp-session-id': 'session-1' } }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: '{"feed_id":"real-note-1"}' }] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', xiaohongshuMcpUrl: 'http://127.0.0.1:18060/mcp', xiaohongshuMcpFetchImpl: mcpFetch })
    const product = await request(app).post('/api/products').send({ name: '青瓷杯', category: '文创', price: 99 }).expect(201)
    await request(app).post(`/api/products/${product.body.data.id}/assets`).attach('image', Buffer.from('image'), { filename: 'cover.png', contentType: 'image/png' }).expect(201)
    const task = await request(app).post('/api/publishing-tasks').send({
      productId: product.body.data.id, creationRecordId: null, productName: '青瓷杯', platform: '小红书',
      title: '真实MCP发布', plannedAt: '2026-08-01T02:00:00.000Z', notes: '正文', status: 'ready', publishedUrl: '',
    }).expect(201)

    await request(app).post(`/api/publishing-tasks/${task.body.data.id}/auto-publish`).expect(201).expect(response => {
      expect(response.body.data.task.publishedUrl).toBe('https://www.xiaohongshu.com/explore/real-note-1')
      expect(response.body.data.execution.adapterId).toBe('xiaohongshu-mcp')
    })
    const publishRequest = JSON.parse(String(mcpFetch.mock.calls[2][1]?.body))
    expect(publishRequest.params.arguments).toMatchObject({ products: ['青瓷杯'], images: [expect.stringMatching(/test-uploads.+\.png$/)] })
    database.close()
  })

  it('requires an HTTPS work URL when a task is published', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).post('/api/publishing-tasks').send({
      productId: null,
      creationRecordId: null,
      productName: '木梳',
      platform: '抖音',
      title: '木梳短视频',
      plannedAt: '2026-07-23T02:00:00.000Z',
      notes: '',
      status: 'published',
      publishedUrl: 'http://example.com/work',
    }).expect(422)
    database.close()
  })
})

describe('performance record API', () => {
  it('creates, lists, updates and deletes platform performance data', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const input = { publishingTaskId: null, productName: '青瓷杯', platform: '小红书', title: '雨后青瓷', recordedOn: '2026-07-22', impressions: 12000, views: 8000, likes: 620, favorites: 310, comments: 48, shares: 32, leads: 20, orders: 6, revenue: 588 }
    const created = await request(app).post('/api/performance-records').send(input).expect(201)
    await request(app).get('/api/performance-records?platform=小红书').expect(200).expect(response => expect(response.body.data[0].id).toBe(created.body.data.id))
    await request(app).put(`/api/performance-records/${created.body.data.id}`).send({ ...input, views: 9000 }).expect(200).expect(response => expect(response.body.data.views).toBe(9000))
    await request(app).delete(`/api/performance-records/${created.body.data.id}`).expect(204)
    database.close()
  })

  it('rejects negative performance metrics', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    await request(app).post('/api/performance-records').send({ publishingTaskId: null, productName: '木梳', platform: '抖音', title: '木梳视频', recordedOn: '2026-07-22', impressions: -1, views: 0, likes: 0, favorites: 0, comments: 0, shares: 0, leads: 0, orders: 0, revenue: 0 }).expect(422)
    database.close()
  })

  it('imports a validated batch atomically and skips duplicate platform-title-date keys', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const record = { publishingTaskId: null, productName: '青瓷杯', platform: '小红书', title: '批量导入作品', recordedOn: '2026-07-25', impressions: 12000, views: 8000, likes: 620, favorites: 310, comments: 48, shares: 32, leads: 20, orders: 6, revenue: 588 }

    await request(app).post('/api/performance-records/import').send({ records: [record, record] }).expect(200).expect(response => {
      expect(response.body.data).toMatchObject({ created: 1, skipped: 1 })
      expect(response.body.data.records).toHaveLength(1)
    })
    await request(app).post('/api/performance-records/import').send({ records: [record] }).expect(200).expect(response => {
      expect(response.body.data).toMatchObject({ created: 0, skipped: 1 })
    })
    database.close()
  })

  it('rejects CSV import batches over 1000 records', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const record = { publishingTaskId: null, productName: '商品', platform: '抖音', title: '作品', recordedOn: '2026-07-25', impressions: 0, views: 0, likes: 0, favorites: 0, comments: 0, shares: 0, leads: 0, orders: 0, revenue: 0 }
    await request(app).post('/api/performance-records/import').send({ records: Array.from({ length: 1001 }, () => record) }).expect(422)
    database.close()
  })
})

describe('product API', () => {
  it('searches and imports a simulated 1688 offer into the product library', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const offers = await request(app).get('/api/sourcing/1688?q=青瓷').expect(200)
    expect(offers.body.meta).toMatchObject({ source: '1688-mock', simulated: true, replaceableAdapter: true })
    expect(offers.body.data).toHaveLength(1)
    const imported = await request(app).post(`/api/sourcing/1688/${offers.body.data[0].id}/import`).expect(201)
    expect(imported.body.data.product).toMatchObject({ name: '青瓷茶杯节日礼盒', cost: 35, supplierUrl: 'https://detail.1688.com/offer/mock-celadon.html' })
    expect(imported.body.data.execution).toMatchObject({ capability: 'supply.1688.collect', status: 'succeeded' })
    await request(app).get('/api/products').expect(200).expect(response => expect(response.body.data[0].supplier).toContain('1688模拟供应商'))
    database.close()
  })

  it('creates an auditable Taobao listing execution from a complete sourced product', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const product = await request(app).post('/api/products').send({
      name: '1688青瓷礼盒', category: '文创礼品', price: 99, cost: 35,
      supplier: '1688模拟供应商', supplierUrl: 'https://detail.1688.com/offer/mock.html',
      sellingPoints: '手工青瓷；礼盒包装',
    }).expect(201)
    await request(app).post(`/api/products/${product.body.data.id}/assets`)
      .attach('image', Buffer.from('image'), { filename: 'main.png', contentType: 'image/png' }).expect(201)

    await request(app).post(`/api/products/${product.body.data.id}/list`).send({ adapterId: 'mock', platform: 'taobao' }).expect(201).expect(response => {
      expect(response.body.data).toMatchObject({ adapterId: 'mock', capability: 'taobao.product.list', status: 'succeeded' })
      expect(response.body.data.output).toMatchObject({ simulated: true, platform: 'taobao' })
    })
    database.close()
  })

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
    const savedTask = await request(app).post('/api/creative-tasks').send({
      productId: created.body.data.id, productName: '完整备份商品', platform: '小红书',
      title: '需要一起备份的创作任务', sellingPoints: ['卖点一'], body: '正文', status: 'draft', failureReason: '',
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
    await request(app).put(`/api/creative-tasks/${savedTask.body.data.id}`).send({
      ...savedTask.body.data, productId: null, title: '备份后被修改的标题',
    }).expect(200)
    rmSync(join(uploadDir, uploaded.body.data.storedName))
    await request(app).post('/api/backup/archive').attach('backup', archive.body, 'backup.zip').expect(200)

    const restored = await request(app).get('/api/products').expect(200)
    expect(restored.body.data[0]).toMatchObject({ name: '完整备份商品' })
    expect(restored.body.data[0].assets).toHaveLength(1)
    expect(existsSync(join(uploadDir, restored.body.data[0].assets[0].storedName))).toBe(true)
    await request(app).get('/api/creation-records').expect(200).expect(response => expect(response.body.data[0].title).toBe('需要一起备份的文案'))
    await request(app).get('/api/creative-tasks').expect(200).expect(response => expect(response.body.data[0].title).toBe('需要一起备份的创作任务'))
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

  it('assigns immutable version numbers and filters history by product, platform and source', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const base = { productId: null, productName: '青瓷杯', platform: '小红书', sellingPoints: ['温润釉色'], body: '正文' }

    const generated = await request(app).post('/api/creation-records').send({ ...base, title: '候选一', source: 'generate' }).expect(201)
    const rewritten = await request(app).post('/api/creation-records').send({ ...base, title: '改写标题', source: 'rewrite_title' }).expect(201)
    await request(app).post('/api/creation-records').send({ ...base, productName: '木梳', platform: '抖音', title: '其他记录', source: 'manual' }).expect(201)

    expect(generated.body.data).toMatchObject({ versionNumber: 1, source: 'generate' })
    expect(rewritten.body.data).toMatchObject({ versionNumber: 2, source: 'rewrite_title' })
    await request(app).get('/api/creation-records?productName=青瓷杯&platform=小红书&source=rewrite_title').expect(200).expect(response => {
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({ title: '改写标题', versionNumber: 2 })
    })
    database.close()
  })

  it('records a safe publication status and HTTPS work URL', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads' })
    const created = await request(app).post('/api/creation-records').send({ productId: null, productName: '青瓷杯', platform: '小红书', title: '标题', sellingPoints: [], body: '正文' }).expect(201)
    await request(app).patch(`/api/creation-records/${created.body.data.id}/publication`).send({ publishStatus: 'published', publishedUrl: 'https://www.xiaohongshu.com/explore/example' }).expect(200).expect(response => {
      expect(response.body.data).toMatchObject({ publishStatus: 'published', publishedUrl: 'https://www.xiaohongshu.com/explore/example' })
    })
    await request(app).patch(`/api/creation-records/${created.body.data.id}/publication`).send({ publishStatus: 'published', publishedUrl: 'http://127.0.0.1/private' }).expect(422)
    await request(app).patch(`/api/creation-records/${created.body.data.id}/publication`).send({ publishStatus: 'published', publishedUrl: '' }).expect(422)
    database.close()
  })
})

describe('AI gateway API', () => {
  it('stores the API key encrypted and never returns it to the browser', async () => {
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', encryptionKey: Buffer.alloc(32, 7) })
    await request(app).put('/api/ai/settings').send({ mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'example-model', apiKey: 'sk-private-value' }).expect(200)
    const settings = await request(app).get('/api/ai/settings').expect(200)
    expect(settings.body.data).toMatchObject({ mode: 'real', model: 'example-model', hasApiKey: true })
    expect(JSON.stringify(settings.body)).not.toContain('sk-private-value')
    database.close()
  })

  it('generates validated platform copy through the configured compatible API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ usage: { prompt_tokens: 1000, completion_tokens: 500 }, choices: [{ message: { content: JSON.stringify({ candidates: [
      { title: '真实生成标题一', sellingPoints: ['卖点一', '卖点二'], body: '真实生成正文一' },
      { title: '真实生成标题二', sellingPoints: ['卖点三'], body: '真实生成正文二' },
      { title: '真实生成标题三', sellingPoints: ['卖点四'], body: '真实生成正文三' },
    ] }) } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', encryptionKey: Buffer.alloc(32, 9), fetchImpl })
    await request(app).put('/api/ai/settings').send({ mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'example-model', apiKey: 'sk-test', inputPricePerMillion: 2, outputPricePerMillion: 8, monthlyBudget: 10 }).expect(200)
    const generated = await request(app).post('/api/ai/generate').send({ platform: '小红书', product: { name: '青瓷杯', category: '茶具', price: 89, material: '陶瓷', audience: '喜欢喝茶的人', scene: '书桌', sellingPoints: '釉色温润', forbiddenTerms: '' }, guidance: '语气自然', count: 3, operation: 'generate' }).expect(200)
    expect(generated.body.data).toMatchObject({ title: '真实生成标题一', body: '真实生成正文一', source: 'ai' })
    expect(generated.body.data.candidates).toHaveLength(3)
    expect(generated.body.data.usage).toMatchObject({ model: 'example-model', inputTokens: 1000, outputTokens: 500, estimatedCost: 0.006 })
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/v1/chat/completions', expect.objectContaining({ method: 'POST' }))
    await request(app).get('/api/ai/usage').expect(200).expect(response => {
      expect(response.body.data.summary).toMatchObject({ calls: 1, successfulCalls: 1, inputTokens: 1000, outputTokens: 500, estimatedCost: 0.006, monthlyBudget: 10 })
      expect(response.body.data.records[0]).toMatchObject({ platform: '小红书', operation: 'generate', success: true })
    })
    database.close()
  })

  it('records failed real AI calls without exposing request content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('upstream failed', { status: 503 }))
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', encryptionKey: Buffer.alloc(32, 5), fetchImpl })
    await request(app).put('/api/ai/settings').send({ mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'example-model', apiKey: 'sk-test' }).expect(200)
    await request(app).post('/api/ai/generate').send({ platform: '抖音', product: { name: '木梳', category: '日用', price: 29 }, guidance: '', count: 1, operation: 'generate' }).expect(502)
    await request(app).get('/api/ai/usage').expect(200).expect(response => {
      expect(response.body.data.summary.calls).toBe(1)
      expect(response.body.data.records[0]).toMatchObject({ platform: '抖音', success: false, errorMessage: 'AI 服务暂时不可用（503），请稍后重试' })
      expect(JSON.stringify(response.body)).not.toContain('木梳')
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    database.close()
  })

  it('retries one transient rate-limit response and then succeeds', async () => {
    const payload = { choices: [{ message: { content: JSON.stringify({ candidates: [{ title: '重试成功', sellingPoints: ['稳定'], body: '正文' }] }) } }] }
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', encryptionKey: Buffer.alloc(32, 6), fetchImpl })
    await request(app).put('/api/ai/settings').send({ mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'example-model', apiKey: 'sk-test' }).expect(200)
    await request(app).post('/api/ai/generate').send({ platform: '小红书', product: { name: '茶杯', category: '茶具', price: 89 }, guidance: '', count: 1, operation: 'generate' }).expect(200).expect(response => {
      expect(response.body.data.title).toBe('重试成功')
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    database.close()
  })

  it.each([
    [401, 'AI 鉴权失败，请检查 API Key'],
    [402, 'AI 服务余额不足，请充值后重试'],
  ])('returns an actionable message for upstream status %s without retrying', async (status, message) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('failed', { status }))
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', encryptionKey: Buffer.alloc(32, 4), fetchImpl })
    await request(app).put('/api/ai/settings').send({ mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'example-model', apiKey: 'sk-test' }).expect(200)
    await request(app).post('/api/ai/generate').send({ platform: '抖音', product: { name: '木梳', category: '日用', price: 29 }, guidance: '', count: 1, operation: 'generate' }).expect(502).expect(response => {
      expect(response.body.message).toBe(message)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    database.close()
  })

  it('does not retry an invalid successful response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{invalid json', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', encryptionKey: Buffer.alloc(32, 8), fetchImpl })
    await request(app).put('/api/ai/settings').send({ mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'example-model', apiKey: 'sk-test' }).expect(200)
    await request(app).post('/api/ai/generate').send({ platform: '小红书', product: { name: '茶杯', category: '茶具', price: 89 }, guidance: '', count: 1, operation: 'generate' }).expect(502).expect(response => {
      expect(response.body.message).toBe('AI 返回内容格式不正确')
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    database.close()
  })

  it('tests the configured AI connection without exposing credentials', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const database = createTestDatabase()
    const app = createApp({ database, uploadDir: 'tmp/test-uploads', encryptionKey: Buffer.alloc(32, 3), fetchImpl })
    await request(app).put('/api/ai/settings').send({ mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'example-model', apiKey: 'sk-test' }).expect(200)
    await request(app).post('/api/ai/test').expect(200).expect(response => expect(response.body.data.connected).toBe(true))
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/v1/models', expect.objectContaining({ method: 'GET' }))
    database.close()
  })
})
