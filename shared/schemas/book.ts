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
  /** Writing goal: total word target and deadline (YYYY-MM-DD); the daily target is derived. */
  goals: z.object({
    target: z.number().int().positive().max(10_000_000).nullable().default(null),
    deadline: z.iso.date().nullable().default(null),
  }).default({ target: null, deadline: null }),
  /** Snapshots: `git` commits each manual snapshot when the book folder is a git repository. */
  snapshots: z.object({ git: z.boolean().default(false) }).default({ git: false }),
  /** In-world dates: what "Day 1" is, and custom calendars (see docs/timeline.md). */
  timeline: TimelineConfigSchema.default({ calendars: [] }),
})

export type BookConfig = z.infer<typeof BookConfigSchema>
export type BookConfigInput = z.input<typeof BookConfigSchema>
