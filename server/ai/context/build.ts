import type { ContextItem, ContextOverrides, OmittedContextItem } from '#shared/schemas/context'
import type { BookContext } from '../../services/workspace'
import { fitToBudget } from './budget'
import { localLayer, pinnedLayer, retrievedLayer, summaryLayer } from './layers'
import { contextBudget } from './tokens'

export interface ContextRequest {
  /** The entry the author has open, if any. */
  entryPath?: string
  /** Text selected in the editor. */
  selection?: string
  /** What the author asks (drives retrieval). */
  query: string
  /** `provider:model` the context is for (sets the token budget). */
  model: string
  overrides?: ContextOverrides
}

export interface BuiltContext {
  items: ContextItem[]
  omitted: OmittedContextItem[]
  budget: number
  used: number
}

/**
 * The context engine: assembles pinned, local, retrieved and summary layers for an AI request and fits
 * them into the model's budget. Every AI feature that sends book content to a model goes through here,
 * so what the context drawer shows is exactly what was sent.
 */
export async function buildContext(book: BookContext, request: ContextRequest): Promise<BuiltContext> {
  const overrides = request.overrides ?? { pinned: [], removed: [] }
  const budget = contextBudget(request.model)
  const entry = request.entryPath ? await book.repository.read(request.entryPath).catch(() => null) : null
  const local = localLayer(entry, request.selection, Math.floor(budget * 0.4 * 3.5))
  const [pinned, retrieved, summaries] = await Promise.all([
    pinnedLayer(book, entry, overrides.pinned),
    retrievedLayer(book, entry, local.map(item => item.text).join('\n'), request.query),
    summaryLayer(book, entry),
  ])
  // A pin of an item another layer already provides pins that item instead of adding a copy.
  const provided = new Set([...local, ...retrieved, ...summaries].map(item => item.id))
  const all = [...pinned.filter(item => item.kind !== 'pin' || !provided.has(item.id)), ...local, ...retrieved, ...summaries]
  return { ...fitToBudget(all, budget, overrides), budget }
}
