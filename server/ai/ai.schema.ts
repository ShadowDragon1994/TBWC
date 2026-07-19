import { z } from 'zod'

const compatibleUrl = z.string().url().max(500).refine(value => {
  const url = new URL(value)
  return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
}, '仅允许 HTTPS 服务或本机 HTTP 服务')

export const aiSettingsInputSchema = z.object({
  mode: z.enum(['mock', 'real']),
  baseUrl: compatibleUrl,
  model: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().min(1).max(500).optional(),
  clearApiKey: z.boolean().optional(),
})

export const aiGenerateInputSchema = z.object({
  platform: z.enum(['小红书', '抖音']),
  product: z.object({
    name: z.string().min(1).max(100), category: z.string().max(60), price: z.number().min(0),
    material: z.string().max(200).optional(), audience: z.string().max(300).optional(), scene: z.string().max(300).optional(),
    sellingPoints: z.string().max(1000).optional(), forbiddenTerms: z.string().max(500).optional(),
  }),
  guidance: z.string().max(1000).default(''),
})

export const generatedContentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  sellingPoints: z.array(z.string().trim().min(1).max(300)).min(1).max(5),
  body: z.string().trim().min(1).max(10000),
})

export type AiSettingsInput = z.infer<typeof aiSettingsInputSchema>
export type AiGenerateInput = z.infer<typeof aiGenerateInputSchema>
