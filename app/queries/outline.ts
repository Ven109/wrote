import { defineQueryOptions } from '@pinia/colada'
import type { BeatSheetList, OutlineDocument } from '#shared/schemas/outline'
import type { OutlineProposal } from '#shared/schemas/outline-proposals'
import { bookKeys, templateKeys } from './keys'

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

/** Beat-sheet templates of the workspace – plain files, so they are re-read whenever the picker opens. */
export const beatSheetsQuery = defineQueryOptions({
  key: templateKeys.beatSheets(),
  query: () => $fetch<BeatSheetList>('/api/templates/beat-sheets'),
  staleTime: 0,
})

/** Pending outline proposals (ghost beats and notes), refreshed by `outline-proposal` events. */
export const outlineProposalsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.outlineProposals(bookId),
  query: () => $fetch<OutlineProposal[]>(`/api/books/${encodeURIComponent(bookId)}/outline/proposals`, { query: { status: 'pending' } }),
  enabled: Boolean(bookId),
}))
