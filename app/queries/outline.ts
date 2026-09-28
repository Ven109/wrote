import { defineQueryOptions } from '@pinia/colada'
import type { OutlineDocument } from '#shared/schemas/outline'
import { bookKeys } from './keys'

/** The plot outline with the file hash (refreshed with the book on file changes). */
export const outlineQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.outline(bookId),
  query: () => $fetch<OutlineDocument>(`/api/books/${encodeURIComponent(bookId)}/outline`),
  enabled: Boolean(bookId),
}))

export interface SceneBeat {
  id: string
  title: string
  summary: string
  actId: string
  actTitle: string
  scenes: string[]
}

/** The beats a scene tells (from the index; refreshed when outline.md changes). */
export const sceneBeatsQuery = defineQueryOptions(({ bookId, sceneId }: { bookId: string, sceneId: string }) => ({
  key: bookKeys.sceneBeats(bookId, sceneId),
  query: () => $fetch<SceneBeat[]>(`/api/books/${encodeURIComponent(bookId)}/beats`, { query: { sceneId } }),
  enabled: Boolean(bookId && sceneId),
}))
