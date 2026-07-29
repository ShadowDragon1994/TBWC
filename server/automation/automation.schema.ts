import { z } from 'zod'

export const automationCapabilitySchema = z.enum([
  'xiaohongshu.trends.collect',
  'xiaohongshu.publish',
  'xiaohongshu.customer-service.read',
  'xiaohongshu.customer-service.send',
  'supply.1688.collect',
  'taobao.product.list',
  'photoshop.bridge',
])

export const automationExecutionInputSchema = z.object({
  adapterId: z.string().trim().min(1).max(100),
  capability: automationCapabilitySchema,
  payload: z.record(z.string(), z.unknown()).default({}),
})
