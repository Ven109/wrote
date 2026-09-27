import type { CodexQuery } from '#shared/schemas/codex'
import type { NotesQuery } from '#shared/schemas/notes'

/**
 * Query key factory. Keys are hierarchical so a whole subtree can be invalidated at once,
 * e.g. `invalidateQueries({ key: bookKeys.book(id) })` refreshes everything of one book.
 */
export const settingsKeys = {
  ai: () => ['settings', 'ai'] as const,
  aiModels: () => ['settings', 'ai', 'models'] as const,
  mcp: () => ['settings', 'mcp'] as const,
}

export const bookKeys = {
  list: () => ['books'] as const,
  book: (bookId: string) => ['book', bookId] as const,
  summary: (bookId: string) => ['book', bookId, 'summary'] as const,
  structure: (bookId: string) => ['book', bookId, 'structure'] as const,
  entry: (bookId: string, entryId: string) => ['book', bookId, 'entry', entryId] as const,
  document: (bookId: string, path: string) => ['book', bookId, 'document', path] as const,
  notes: (bookId: string) => ['book', bookId, 'notes'] as const,
  noteList: (bookId: string, query: NotesQuery) => ['book', bookId, 'notes', 'list', query.filter, query.tag ?? '', query.q ?? ''] as const,
  noteCounts: (bookId: string) => ['book', bookId, 'notes', 'counts'] as const,
  links: (bookId: string) => ['book', bookId, 'links'] as const,
  entryLinks: (bookId: string, entryId: string) => ['book', bookId, 'links', 'entry', entryId] as const,
  linkTargets: (bookId: string) => ['book', bookId, 'links', 'targets'] as const,
  resolvedLinks: (bookId: string, targets: string[]) => ['book', bookId, 'links', 'resolve', ...targets] as const,
  jobs: (bookId: string) => ['book', bookId, 'jobs'] as const,
  chatThreads: (bookId: string) => ['book', bookId, 'chat', 'threads'] as const,
  codex: (bookId: string) => ['book', bookId, 'codex'] as const,
  codexList: (bookId: string, query: CodexQuery) => ['book', bookId, 'codex', 'list', query.type ?? '', query.tag ?? '', query.q ?? ''] as const,
  codexTypes: (bookId: string) => ['book', bookId, 'codex', 'types'] as const,
  search: (bookId: string, query: string) => ['book', bookId, 'search', query] as const,
}
