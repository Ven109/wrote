import type { EntryType } from '../schemas/entry'

/** Top-level folders and files of a book. Paths are POSIX and relative to the book root. */
export const BOOK_LAYOUT = {
  manuscript: 'manuscript',
  notes: 'notes',
  inbox: 'notes/inbox',
  codex: 'codex',
  research: 'research',
  /** Custom review agents (`<id>.md`: settings in frontmatter, instructions in the body). */
  agents: 'agents',
  /** Front and back matter for export (`dedication.md`, `epigraph.md`, `copyright.md`, `acknowledgements.md`, `about-the-author.md`). */
  matter: 'matter',
  outline: 'outline.md',
  styleGuide: 'style-guide.md',
  index: '.wrote',
} as const

/** File holding the metadata of a part or chapter folder. */
export const FOLDER_INDEX_FILE = 'index.md'

/**
 * Derives the entry type from a book-relative Markdown path, or `null` if the file is not an entry.
 * Manuscript depth: `manuscript/<part>/index.md` (part), `manuscript/<part>/<chapter>/index.md` (chapter),
 * `manuscript/<part>/<chapter>/<scene>.md` (scene).
 */
export function entryTypeFromPath(path: string): EntryType | null {
  if (!path.endsWith('.md')) return null
  if (path === BOOK_LAYOUT.outline) return 'outline'
  if (path === BOOK_LAYOUT.styleGuide) return 'style-guide'

  const segments = path.split('/')
  const [root] = segments
  if (root === BOOK_LAYOUT.notes) return 'note'
  if (root === BOOK_LAYOUT.codex) return 'codex'
  if (root === BOOK_LAYOUT.research) return 'research'
  if (root !== BOOK_LAYOUT.manuscript) return null

  const isIndex = segments.at(-1) === FOLDER_INDEX_FILE
  if (segments.length === 3 && isIndex) return 'part'
  if (segments.length === 4) return isIndex ? 'chapter' : 'scene'
  return null
}

export function isInboxPath(path: string): boolean {
  return path.startsWith(`${BOOK_LAYOUT.inbox}/`)
}
