import { z } from 'zod'

export const BOOK_CONFIG_FILE = 'wrote.json'

export const BookConfigSchema = z.looseObject({
  $schema: z.string().optional(),
  version: z.literal(1).default(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  language: z.string().min(2).default('en'),
  template: z.enum(['novel', 'non-fiction', 'blank']).default('blank'),
  created: z.iso.datetime().optional(),
  ai: z.object({
    model: z.string().optional(),
  }).default({}),
})

export type BookConfig = z.infer<typeof BookConfigSchema>
export type BookConfigInput = z.input<typeof BookConfigSchema>
