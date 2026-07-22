import { z } from 'zod'

const count = z.number().int().min(0).max(1_000_000_000)
export const performanceRecordInputSchema = z.object({
  publishingTaskId: z.string().uuid().nullable().default(null),
  productName: z.string().trim().min(1).max(100), platform: z.enum(['小红书', '抖音']), title: z.string().trim().min(1).max(200),
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), impressions: count, views: count, likes: count, favorites: count,
  comments: count, shares: count, leads: count, orders: count, revenue: z.number().min(0).max(1_000_000_000),
})
export const performanceRecordQuerySchema = z.object({ platform: z.enum(['小红书', '抖音']).or(z.literal('')).default(''), productName: z.string().trim().max(100).default('') })
export type PerformanceRecordInput = z.infer<typeof performanceRecordInputSchema>
export type PerformanceRecord = PerformanceRecordInput & { id: string; createdAt: string; updatedAt: string }
export const performanceRecordSchema = performanceRecordInputSchema.and(z.object({ id: z.string().uuid(), createdAt: z.string(), updatedAt: z.string() }))
