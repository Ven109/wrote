import { z } from 'zod'
import { TimelineConfigSchema } from './timeline'

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
  /** Export options. `blocks`: per custom block type (`note`, `callout`, `codex-card`, `scene-break`), include or strip. */
  export: z.object({
    blocks: z.record(z.string(), z.enum(['include', 'strip'])).default({}),
  }).default({ blocks: {} }),
  /** In-world dates: what "Day 1" is, and custom calendars (see docs/timeline.md). */
  timeline: TimelineConfigSchema.default({ calendars: [] }),
})

export type BookConfig = z.infer<typeof BookConfigSchema>
export type BookConfigInput = z.input<typeof BookConfigSchema>
