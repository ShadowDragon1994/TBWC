import { describe, expect, it } from 'vitest'
import { createAutomationService, type AutomationAdapter } from './automation.service'

describe('automation service', () => {
  it('executes a Xiaohongshu publish job with the selected replaceable adapter', async () => {
    const adapter: AutomationAdapter = {
      id: 'mock',
      name: '模拟执行器',
      capabilities: ['xiaohongshu.publish'],
      execute: async job => ({
        externalId: `mock-${job.id}`,
        externalUrl: 'https://www.xiaohongshu.com/explore/mock-note',
        output: { steps: ['打开创作中心', '填写图文', '提交发布'] },
      }),
    }
    const service = createAutomationService({ adapters: [adapter] })

    const result = await service.execute({
      adapterId: 'mock',
      capability: 'xiaohongshu.publish',
      payload: { title: '青瓷杯', body: '正文', assets: [] },
    })

    expect(result).toMatchObject({
      adapterId: 'mock',
      capability: 'xiaohongshu.publish',
      status: 'succeeded',
      externalUrl: 'https://www.xiaohongshu.com/explore/mock-note',
    })
    expect(result.startedAt).toEqual(expect.any(String))
    expect(result.finishedAt).toEqual(expect.any(String))
  })

  it('reports unsupported capabilities before invoking an adapter', async () => {
    const service = createAutomationService({
      adapters: [{
        id: 'cli',
        name: 'CLI 执行器',
        capabilities: ['photoshop.bridge'],
        execute: async () => ({ output: {} }),
      }],
    })

    await expect(service.execute({
      adapterId: 'cli',
      capability: 'xiaohongshu.customer-service.send',
      payload: { conversationId: 'c-1', message: '您好' },
    })).rejects.toThrow('适配器不支持')
  })

  it('keeps failed executions auditable without exposing secret fields', async () => {
    const service = createAutomationService({
      adapters: [{
        id: 'rpa',
        name: 'RPA 执行器',
        capabilities: ['xiaohongshu.publish'],
        execute: async () => { throw new Error('浏览器未登录') },
      }],
    })

    await expect(service.execute({
      adapterId: 'rpa',
      capability: 'xiaohongshu.publish',
      payload: { title: '标题', cookie: 'private-cookie' },
    })).rejects.toThrow('浏览器未登录')

    expect(JSON.stringify(service.listExecutions())).not.toContain('private-cookie')
    expect(service.listExecutions()[0]).toMatchObject({
      adapterId: 'rpa',
      status: 'failed',
      errorMessage: '浏览器未登录',
    })
  })
})
