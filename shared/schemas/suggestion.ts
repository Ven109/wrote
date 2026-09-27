import { z } from 'zod'
import { EntryIdSchema } from './entry'

export const SuggestionStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'stale'])
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>

/** `replace`: `find` becomes `replace`. `insert`: `replace` is new text (blocks) added after the paragraph containing `find`. */
export const SuggestionKindSchema = z.enum(['replace', 'insert'])
export type SuggestionKind = z.infer<typeof SuggestionKindSchema>

export const ActorSchema = z.object({
  kind: z.enum(['user', 'assistant', 'mcp', 'agent']),
  name: z.string().min(1),
})
export type Actor = z.infer<typeof ActorSchema>

/**
 * A proposed text change to an entry – the "AI proposes, author decides" mechanic. `find` anchors the change
 * (exact Markdown in the entry body when proposed); `before`/`after` hold the surrounding text, so the anchor
 * can be found again after nearby edits. Nothing changes in the entry until the author accepts.
 */
export const SuggestionSchema = z.object({
  id: z.string().regex(/^sug_[a-z0-9]{10}$/),
  entryId: EntryIdSchema,
  kind: SuggestionKindSchema.default('replace'),
  find: z.string().min(1),
  replace: z.string(),
  before: z.string().default(''),
  after: z.string().default(''),
  rationale: z.string().optional(),
  author: ActorSchema,
  /** `provider:model` that wrote the proposal, when known. */
  model: z.string().nullable().default(null),
  status: SuggestionStatusSchema.default('pending'),
  /** What the author actually applied, if they edited the proposal before accepting. */
  appliedText: z.string().optional(),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().optional(),
})
export type Suggestion = z.infer<typeof SuggestionSchema>

/** A suggestion as listed: `stale` when its anchor text can no longer be found in the entry. */
export type SuggestionView = Suggestion & { stale: boolean }

export const SuggestionQuerySchema = z.object({
  entryId: EntryIdSchema.optional(),
  status: SuggestionStatusSchema.optional(),
})

/** Accept or reject suggestions. `text` (the author's edit of the proposal) only with a single id. */
export const ResolveSuggestionsSchema = z.object({
  ids: z.array(z.string().regex(/^sug_[a-z0-9]{10}$/)).min(1).max(200),
  status: z.enum(['accepted', 'rejected']),
  text: z.string().max(50_000).optional(),
}).refine(input => input.text === undefined || (input.ids.length === 1 && input.status === 'accepted'), 'An edited text needs exactly one accepted suggestion')
export type ResolveSuggestionsInput = z.infer<typeof ResolveSuggestionsSchema>

/** Pushed on the book event stream (SSE event `suggestion`) when suggestions of an entry change. */
export interface SuggestionEvent {
  entryId: string
}
