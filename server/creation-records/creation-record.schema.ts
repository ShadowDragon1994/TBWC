import { z } from 'zod'

export const creationRecordInputSchema = z.object({
  productId: z.string().uuid().nullable(),
  productName: z.string().trim().min(1).max(100),
  platform: z.string().trim().min(1).max(30),
  title: z.string().trim().min(1).max(200),
  sellingPoints: z.array(z.string().trim().min(1).max(300)).max(10),
  body: z.string().max(10000),
})

export type CreationRecordInput = z.infer<typeof creationRecordInputSchema>
export type CreationRecord = CreationRecordInput & { id: string; createdAt: string; updatedAt: string }
