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
      return { output: { accepted: true, simulated: true, capability: job.capability } }
    },
  }
}
