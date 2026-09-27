import { z } from 'zod'
import type { EntryType } from './entry'

/**
 * Context layers, in the order they appear in the prompt:
 * pinned (always wanted: style guide, synopsis, author pins), local (what the author is working on),
 * retrieved (codex entries mentioned, search hits for the request), summary (rolling summaries).
 */
export const CONTEXT_LAYERS = ['pinned', 'local', 'retrieved', 'summary'] as const
export type ContextLayer = (typeof CONTEXT_LAYERS)[number]

export const CONTEXT_KINDS = ['style-guide', 'synopsis', 'pin', 'selection', 'entry', 'codex', 'search', 'summary'] as const
export type ContextKind = (typeof CONTEXT_KINDS)[number]

/** One piece of context. `id` is stable across rebuilds (`<kind>:<entry id>`), so it can be pinned or removed. */
export interface ContextItem {
  id: string
  layer: ContextLayer
  kind: ContextKind
  title: string
  /** The book entry it comes from, if any (for links in the drawer). */
  source: { entryId: string, path: string, type: EntryType } | null
  text: string
  /** Estimated tokens of `text`. */
  tokens: number
  /** Pinned by the author: kept first and never trimmed. */
  pinned: boolean
}

/** An item left out to fit the token budget (or removed by the author), without its text. */
export type OmittedContextItem = Omit<ContextItem, 'text'> & { reason: 'budget' | 'removed' }

/** What the author changed in the context drawer: items to always include or to leave out. */
export const ContextOverridesSchema = z.object({
  pinned: z.array(z.string().max(200)).max(50).default([]),
  removed: z.array(z.string().max(200)).max(200).default([]),
})
export type ContextOverrides = z.infer<typeof ContextOverridesSchema>

/** Exactly what was sent with one AI request (`GET /api/books/:bookId/context/:snapshotId`). */
export interface ContextSnapshot {
  id: string
  createdAt: string
  /** Which AI feature made the request, e.g. `assistant`. */
  feature: string
  model: string
  /** Token budget for context items and how much was used. */
  budget: number
  used: number
  items: ContextItem[]
  omitted: OmittedContextItem[]
  /** The full system prompt as sent to the model. */
  system: string
}
