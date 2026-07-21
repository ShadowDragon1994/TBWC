import { z } from 'zod'

export const creationRecordSourceSchema = z.enum(['generate', 'rewrite_title', 'rewrite_selling_points', 'rewrite_body', 'manual'])

export const creationRecordInputSchema = z.object({
  productId: z.string().uuid().nullable(),
  productName: z.string().trim().min(1).max(100),
  platform: z.string().trim().min(1).max(30),
  title: z.string().trim().min(1).max(200),
  sellingPoints: z.array(z.string().trim().min(1).max(300)).max(10),
  body: z.string().max(10000),
  source: creationRecordSourceSchema.default('manual'),
})

export const creationRecordSchema = creationRecordInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  versionNumber: z.number().int().positive().default(1),
})

export const creationRecordQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  productName: z.string().trim().max(100).default(''),
  platform: z.enum(['小红书', '抖音']).or(z.literal('')).default(''),
  source: creationRecordSourceSchema.or(z.literal('')).default(''),
})

export type CreationRecordInput = z.infer<typeof creationRecordInputSchema>
export type CreationRecord = z.infer<typeof creationRecordSchema>
export type CreationRecordQuery = z.infer<typeof creationRecordQuerySchema>
