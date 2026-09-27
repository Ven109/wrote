import { z } from 'zod'
import { EntryIdSchema } from './entry'

/** What a summary covers. Parts and chapters roll up their children; the book rolls up its parts. */
export const SUMMARY_SCOPES = ['scene', 'chapter', 'part', 'book'] as const
export type SummaryScope = (typeof SUMMARY_SCOPES)[number]

/** Id used for the whole-book summary. */
export const BOOK_SUMMARY_ID = 'book'

export interface Summary {
  /** Entry id, or `book` for the whole book. */
  entryId: string
  scope: SummaryScope
  text: string
  /** Written by the author: background jobs never overwrite it. */
  isManual: boolean
  /** `provider:model` that wrote it (null for manual summaries). */
  model: string | null
  updatedAt: string
}

export const SummaryEntryIdSchema = z.union([EntryIdSchema, z.literal(BOOK_SUMMARY_ID)])

export const SummaryQuerySchema = z.object({ entryId: SummaryEntryIdSchema.optional() })

export const UpdateSummarySchema = z.object({
  entryId: SummaryEntryIdSchema,
  text: z.string().trim().min(1).max(4000),
})

/** Background summaries: opt-in (they send the manuscript to the model), capped by a daily token budget. */
export const SummarySettingsSchema = z.object({
  enabled: z.boolean().default(false),
  dailyTokenBudget: z.number().int().min(1000).max(10_000_000).default(100_000),
})
export type SummarySettings = z.infer<typeof SummarySettingsSchema>

/** Patch: omitted fields stay unchanged (no defaults – Zod's `.partial()` would keep them). */
export const SummarySettingsPatchSchema = z.object({
  enabled: z.boolean().optional(),
  dailyTokenBudget: z.number().int().min(1000).max(10_000_000).optional(),
})
