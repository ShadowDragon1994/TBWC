import { z } from 'zod'

export const creativeTaskStatusSchema = z.enum(['draft', 'editing', 'checking', 'confirming', 'exporting', 'completed', 'failed'])

export const creativeTaskInputSchema = z.object({
  productId: z.string().uuid().nullable().default(null),
  productName: z.string().trim().min(1).max(100),
  platform: z.enum(['小红书', '抖音']),
  title: z.string().max(200).default(''),
  sellingPoints: z.array(z.string().trim().max(500)).max(10).default([]),
  body: z.string().max(10000).default(''),
  status: creativeTaskStatusSchema.default('draft'),
  failureReason: z.string().trim().max(1000).default(''),
})

export const creativeTaskQuerySchema = z.object({
  status: creativeTaskStatusSchema.or(z.literal('')).default(''),
  platform: z.enum(['小红书', '抖音']).or(z.literal('')).default(''),
})

export type CreativeTaskStatus = z.infer<typeof creativeTaskStatusSchema>
export type CreativeTaskInput = z.infer<typeof creativeTaskInputSchema>
export type CreativeTaskQuery = z.infer<typeof creativeTaskQuerySchema>
export type CreativeTask = CreativeTaskInput & { id: string; createdAt: string; updatedAt: string }

