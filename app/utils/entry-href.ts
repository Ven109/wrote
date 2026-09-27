import type { EntryType } from '#shared/schemas/entry'

const SECTION_BY_TYPE: Partial<Record<EntryType, string>> = {
  part: 'write',
  chapter: 'write',
  scene: 'write',
  note: 'notes',
  codex: 'codex',
  research: 'research',
  outline: 'outline',
}

/** App route of an entry, by type (`/books/:book/<section>/<path>`). */
export function entryHref(bookId: string, entry: { type: EntryType, path: string }): string {
  return `/books/${bookId}/${SECTION_BY_TYPE[entry.type] ?? 'write'}/${entry.path}`
}
