import { z } from 'zod'
import { ActorSchema } from './suggestion'

/**
 * A passage of AI-written text the author accepted, stored in `.wrote/provenance/<entry id>.json` – never in the
 * prose. `text` is the passage as accepted (Markdown); `before`/`after` locate it again after other edits.
 */
export const ProvenanceRangeSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  before: z.string().default(''),
  after: z.string().default(''),
  author: ActorSchema,
  model: z.string().nullable().default(null),
  suggestionId: z.string().nullable().default(null),
  acceptedAt: z.iso.datetime(),
})
export type ProvenanceRange = z.infer<typeof ProvenanceRangeSchema>

export const ProvenanceFileSchema = z.object({
  version: z.literal(1),
  entryId: z.string(),
  ranges: z.array(ProvenanceRangeSchema).default([]),
})
export type ProvenanceFile = z.infer<typeof ProvenanceFileSchema>

/**
 * A range as found in the current text: `text`, `before` and `after` are the passage and its surroundings
 * *now* (for highlighting); `changed` is how much the author rewrote the accepted text (0…1).
 */
export type ResolvedProvenance = ProvenanceRange & { changed: number, words: number }

/** AI-assisted share of an entry or a group of entries. */
export interface ProvenanceStats {
  aiWords: number
  totalWords: number
  /** aiWords / totalWords, 0 when empty. */
  share: number
}

export interface EntryProvenance {
  entryId: string
  ranges: ResolvedProvenance[]
  stats: ProvenanceStats
}

export const ProvenanceQuerySchema = z.object({ entryId: z.string().regex(/^[a-z]{3}_[a-z0-9]+$/) })
