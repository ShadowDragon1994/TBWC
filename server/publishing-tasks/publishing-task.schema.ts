import { z } from 'zod'

export const publishingTaskStatusSchema = z.enum(['editing', 'review', 'ready', 'published'])

export const publishingTaskInputSchema = z.object({
  productId: z.string().uuid().nullable().default(null),
  creationRecordId: z.string().uuid().nullable().default(null),
  productName: z.string().trim().min(1).max(100),
  platform: z.enum(['小红书', '抖音']),
  title: z.string().trim().min(1).max(200),
  plannedAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(2000).default(''),
  status: publishingTaskStatusSchema.default('editing'),
  publishedUrl: z.string().trim().max(2000).default(''),
}).superRefine((value, context) => {
  if (value.status === 'published' && !/^https:\/\//i.test(value.publishedUrl)) {
    context.addIssue({ code: 'custom', path: ['publishedUrl'], message: '已发布任务必须填写 HTTPS 作品链接' })
  }
})

export const publishingTaskQuerySchema = z.object({
  platform: z.enum(['小红书', '抖音']).or(z.literal('')).default(''),
  status: publishingTaskStatusSchema.or(z.literal('')).default(''),
  productName: z.string().trim().max(100).default(''),
})

export type PublishingTaskInput = z.infer<typeof publishingTaskInputSchema>
export type PublishingTaskQuery = z.infer<typeof publishingTaskQuerySchema>
export type PublishingTask = PublishingTaskInput & {
  id: string
  actualPublishedAt: string | null
  createdAt: string
  updatedAt: string
}

export const publishingTaskSchema = publishingTaskInputSchema.and(z.object({
  id: z.string().uuid(), actualPublishedAt: z.string().datetime({ offset: true }).nullable(), createdAt: z.string(), updatedAt: z.string(),
}))
