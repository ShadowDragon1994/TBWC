import type { AutomationAdapter } from './automation.service'

export function createMockAutomationAdapter(): AutomationAdapter {
  return {
    id: 'mock',
    name: '模拟执行器',
    capabilities: [
      'xiaohongshu.trends.collect',
      'xiaohongshu.publish',
      'xiaohongshu.customer-service.read',
      'xiaohongshu.customer-service.send',
      'supply.1688.collect',
      'taobao.product.list',
      'photoshop.bridge',
    ],
    async execute(job) {
      if (job.capability === 'xiaohongshu.publish') {
        return {
          externalId: `mock-note-${job.id}`,
          externalUrl: `https://www.xiaohongshu.com/explore/mock-${job.id}`,
          output: { steps: ['打开小红书创作中心', '上传素材并填写内容', '提交发布'], simulated: true },
        }
      }
      if (job.capability === 'taobao.product.list') {
        return {
          externalId: `mock-item-${job.id}`,
          externalUrl: `https://item.taobao.com/item.htm?id=mock-${job.id}`,
          output: { accepted: true, simulated: true, platform: 'taobao', reviewStatus: 'submitted' },
        }
      }
      return { output: { accepted: true, simulated: true, capability: job.capability } }
    },
  }
}
