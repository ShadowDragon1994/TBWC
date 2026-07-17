import { z } from 'zod'

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(60),
  price: z.number().finite().min(0),
  cost: z.number().finite().min(0).nullable().optional(),
  material: z.string().max(200).optional(),
  size: z.string().max(100).optional(),
  color: z.string().max(100).optional(),
  audience: z.string().max(300).optional(),
  scene: z.string().max(300).optional(),
  sellingPoints: z.string().max(1000).optional(),
  forbiddenTerms: z.string().max(500).optional(),
  supplier: z.string().max(100).optional(),
  supplierUrl: z.union([z.literal(''), z.string().url().max(500)]).optional(),
})

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  products: z.array(productInputSchema.extend({ id: z.string().uuid(), createdAt: z.string(), updatedAt: z.string() })).max(5000),
})
