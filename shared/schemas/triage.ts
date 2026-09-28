import type { EntryType } from './entry'

/** Where a triage link suggestion comes from: named in the note, or found similar by search. */
export type TriageLinkReason = 'mentioned' | 'related'

export interface TriageLink {
  id: string
  title: string
  type: EntryType
  reason: TriageLinkReason
}

/** Suggestions for an inbox note: tags from similar notes, codex links, and the chapter it seems to belong to. */
export interface TriageSuggestions {
  tags: string[]
  links: TriageLink[]
  chapter: { id: string, title: string, path: string } | null
}
