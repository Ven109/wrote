import type { ModelPurpose } from '#shared/schemas/ai'
import type { CodexQuery } from '#shared/schemas/codex'
import type { NotesQuery } from '#shared/schemas/notes'

/**
 * Query key factory. Keys are hierarchical so a whole subtree can be invalidated at once,
 * e.g. `invalidateQueries({ key: bookKeys.book(id) })` refreshes everything of one book.
 */
export const settingsKeys = {
  ai: () => ['settings', 'ai'] as const,
  /** Without a purpose: the prefix of both model lists (for invalidation). */
  aiModels: (purpose?: ModelPurpose) => (purpose ? ['settings', 'ai', 'models', purpose] as const : ['settings', 'ai', 'models'] as const),
  mcp: () => ['settings', 'mcp'] as const,
  integrations: () => ['settings', 'integrations'] as const,
  /** Without months: the prefix of all usage reports (for invalidation). */
  usage: (months?: number) => (months ? ['settings', 'usage', months] as const : ['settings', 'usage'] as const),
}

/** Export tools on this machine (Pandoc, Typst). */
export const exportKeys = {
  capabilities: () => ['export', 'capabilities'] as const,
}

/** Workspace-wide templates (shared by all books). */
export const templateKeys = {
  beatSheets: () => ['templates', 'beat-sheets'] as const,
}

export const bookKeys = {
  list: () => ['books'] as const,
  book: (bookId: string) => ['book', bookId] as const,
  summary: (bookId: string) => ['book', bookId, 'summary'] as const,
  structure: (bookId: string) => ['book', bookId, 'structure'] as const,
  outline: (bookId: string) => ['book', bookId, 'outline'] as const,
  outlineProposals: (bookId: string) => ['book', bookId, 'outline-proposals'] as const,
  reviewAgents: (bookId: string) => ['book', bookId, 'review', 'agents'] as const,
  agentFiles: (bookId: string) => ['book', bookId, 'review', 'agent-files'] as const,
  reviewRuns: (bookId: string, sceneId: string) => ['book', bookId, 'review', 'runs', sceneId] as const,
  sceneBeats: (bookId: string, sceneId: string) => ['book', bookId, 'beats', sceneId] as const,
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
  suggestions: (bookId: string) => ['book', bookId, 'suggestions'] as const,
  entrySuggestions: (bookId: string, entryId: string) => ['book', bookId, 'suggestions', entryId] as const,
  provenance: (bookId: string) => ['book', bookId, 'provenance'] as const,
  entryProvenance: (bookId: string, entryId: string) => ['book', bookId, 'provenance', 'entry', entryId] as const,
  provenanceStats: (bookId: string) => ['book', bookId, 'provenance', 'stats'] as const,
  approvals: (bookId: string) => ['book', bookId, 'approvals'] as const,
  entryComments: (bookId: string, entryId: string) => ['book', bookId, 'comments', entryId] as const,
  noteTriage: (bookId: string, path: string) => ['book', bookId, 'triage', path] as const,
  timeline: (bookId: string) => ['book', bookId, 'timeline'] as const,
  exportPresets: (bookId: string) => ['book', bookId, 'export-presets'] as const,
  goals: (bookId: string) => ['book', bookId, 'goals'] as const,
  snapshots: (bookId: string) => ['book', bookId, 'snapshots'] as const,
  snapshotList: (bookId: string, path: string) => ['book', bookId, 'snapshots', 'list', path] as const,
  snapshotDiff: (bookId: string, snapshotId: string) => ['book', bookId, 'snapshots', 'diff', snapshotId] as const,
  activity: (bookId: string) => ['book', bookId, 'activity'] as const,
  activityList: (bookId: string, filter: Record<string, unknown>) => ['book', bookId, 'activity', filter] as const,
  contextSnapshot: (bookId: string, snapshotId: string) => ['book', bookId, 'context', snapshotId] as const,
  codex: (bookId: string) => ['book', bookId, 'codex'] as const,
  codexList: (bookId: string, query: CodexQuery) => ['book', bookId, 'codex', 'list', query.type ?? '', query.tag ?? '', query.q ?? ''] as const,
  codexTypes: (bookId: string) => ['book', bookId, 'codex', 'types'] as const,
  codexMentions: (bookId: string) => ['book', bookId, 'codex', 'mentions'] as const,
  codexAppearances: (bookId: string, entryId: string) => ['book', bookId, 'codex', 'appears', entryId] as const,
  codexProposals: (bookId: string) => ['book', bookId, 'codex', 'proposals'] as const,
  search: (bookId: string, query: string) => ['book', bookId, 'search', query] as const,
  summaries: (bookId: string) => ['book', bookId, 'summaries'] as const,
  entrySummary: (bookId: string, entryId: string) => ['book', bookId, 'summaries', entryId] as const,
}
