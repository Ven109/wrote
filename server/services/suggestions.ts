import { SuggestionSchema, type Actor, type ResolveSuggestionsInput, type Suggestion, type SuggestionKind, type SuggestionStatus, type SuggestionView } from '#shared/schemas/suggestion'
import { createRecordId } from '#shared/utils/ids'
import { anchorContext, locateAnchor } from '#shared/utils/text-anchor'
import { findSuggestions, upsertSuggestion } from '../db/state/suggestions'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { readLegacySuggestionFiles, removeLegacySuggestionFiles } from '../storage/legacy-suggestions'
import { publishSuggestionEvent } from '../utils/book-events'
import { getEntry } from './entries'
import type { BookContext } from './workspace'

export interface ProposeInput {
  entryId: string
  kind?: SuggestionKind
  find: string
  replace: string
  rationale?: string
  author: Actor
}

async function bodyOf(book: BookContext, entryId: string): Promise<string | null> {
  return (await getEntry(book.db, book.repository, { id: entryId }).catch(() => null))?.body ?? null
}

/**
 * Stores a pending suggestion – the only way AI and MCP clients change prose. `find` must occur exactly once
 * in the entry; its surroundings are stored so the anchor survives later edits. Nothing is written to the entry.
 */
export async function createSuggestion(book: BookContext, input: ProposeInput, now = new Date()): Promise<Suggestion> {
  const body = await bodyOf(book, input.entryId)
  if (body === null) throw new NotFoundError(`Entry ${input.entryId}`)
  const occurrences = body.split(input.find).length - 1
  if (occurrences !== 1) {
    throw new InvalidInputError(occurrences === 0 ? '`find` text does not occur in the entry' : '`find` text occurs more than once – include more context')
  }
  const from = body.indexOf(input.find)
  const suggestion = SuggestionSchema.parse({
    ...input,
    ...anchorContext(body, { from, to: from + input.find.length }),
    id: createRecordId('sug', 10),
    status: 'pending',
    createdAt: now.toISOString(),
  })
  await upsertSuggestion(book.state, suggestion)
  publishSuggestionEvent(book.id, { entryId: suggestion.entryId })
  return suggestion
}

/** Suggestions, pending ones flagged `stale` when their anchor text is no longer in the entry. */
export async function listSuggestions(book: BookContext, filter: { entryId?: string, status?: SuggestionStatus } = {}): Promise<SuggestionView[]> {
  const suggestions = await findSuggestions(book.state, filter)
  const bodies = new Map<string, string | null>()
  const views: SuggestionView[] = []
  for (const suggestion of suggestions) {
    if (suggestion.status !== 'pending') {
      views.push({ ...suggestion, stale: false })
      continue
    }
    if (!bodies.has(suggestion.entryId)) bodies.set(suggestion.entryId, await bodyOf(book, suggestion.entryId))
    const body = bodies.get(suggestion.entryId) ?? null
    views.push({ ...suggestion, stale: body === null || !locateAnchor(body, suggestion.find, suggestion) })
  }
  return views
}

/**
 * Records the author's decision. Accepting is applied by the editor (an undoable edit, saved with the
 * document); this only marks the suggestions resolved – so no suggestion can change text on its own.
 */
export async function resolveSuggestions(book: BookContext, input: ResolveSuggestionsInput, now = new Date()): Promise<Suggestion[]> {
  const found = await findSuggestions(book.state, { ids: input.ids })
  const missing = input.ids.filter(id => !found.some(suggestion => suggestion.id === id))
  if (missing.length) throw new NotFoundError(`Suggestion ${missing.join(', ')}`)
  const open = found.filter(suggestion => suggestion.status === 'pending' || suggestion.status === 'stale')
  if (open.length !== found.length) throw new InvalidInputError('Some suggestions are already resolved')
  const resolved = await Promise.all(open.map(suggestion => upsertSuggestion(book.state, {
    ...suggestion,
    status: input.status,
    resolvedAt: now.toISOString(),
    ...(input.text !== undefined && input.text !== suggestion.replace ? { appliedText: input.text } : {}),
  })))
  for (const entryId of new Set(resolved.map(suggestion => suggestion.entryId))) publishSuggestionEvent(book.id, { entryId })
  return resolved
}

/** Moves suggestions from the old `.wrote/suggestions/*.json` files into state.db (once, on book open). */
export async function importLegacySuggestions(book: BookContext): Promise<number> {
  const files = await readLegacySuggestionFiles(book.root)
  for (const raw of files) {
    const suggestion = SuggestionSchema.safeParse(raw)
    if (suggestion.success) await upsertSuggestion(book.state, suggestion.data)
  }
  if (files.length) await removeLegacySuggestionFiles(book.root)
  return files.length
}
