import { z } from 'zod'
import { EntryPathSchema } from './document'

export const NOTE_FILTERS = ['all', 'inbox', 'pinned', 'recent'] as const
export const NoteFilterSchema = z.enum(NOTE_FILTERS)
export type NoteFilter = z.infer<typeof NoteFilterSchema>

export const NotesQuerySchema = z.object({
  filter: NoteFilterSchema.default('all'),
  tag: z.string().trim().min(1).max(60).optional(),
  q: z.string().trim().max(200).optional(),
})
export type NotesQuery = z.infer<typeof NotesQuerySchema>

export interface NoteSummary {
  id: string
  path: string
  title: string
  tags: string[]
  pinned: boolean
  inbox: boolean
  updated: string | null
  excerpt: string
}

export interface NoteCounts {
  all: number
  inbox: number
  pinned: number
  tags: { tag: string, count: number }[]
}

/** Quick capture: first line becomes the title, the rest the body. */
export const CaptureNoteSchema = z.object({ text: z.string().trim().min(1).max(20_000) })
export type CaptureNoteInput = z.infer<typeof CaptureNoteSchema>

export const FileNoteSchema = z.object({ path: EntryPathSchema })
