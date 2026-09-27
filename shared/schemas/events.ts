export type BookChangeKind = 'added' | 'changed' | 'removed'

/** A change to an entry file in a book, pushed to clients over SSE. */
export interface BookChangeEvent {
  kind: BookChangeKind
  path: string
  /** Content hash after the change (absent for removals). Lets clients skip changes they made themselves. */
  hash?: string
}
