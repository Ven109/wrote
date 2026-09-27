export type BookChangeKind = 'added' | 'changed' | 'removed'

/** A change to an entry file in a book, pushed to clients over SSE. */
export interface BookChangeEvent {
  kind: BookChangeKind
  path: string
}
