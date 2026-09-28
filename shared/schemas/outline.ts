import { z } from 'zod'

export const BeatIdSchema = z.string().regex(/^bt_[a-z0-9]+$/)
export const ActIdSchema = z.string().regex(/^act_[a-z0-9]+$/)

export interface Beat {
  id: string
  title: string
  /** What happens (Markdown paragraphs). */
  summary: string
  /** Scenes that tell this beat, in order. Empty = not written yet. */
  scenes: string[]
}

export interface Act {
  id: string
  title: string
  beats: Beat[]
}

/** The book's plot outline (`outline.md`): free notes, then acts with their beats. */
export interface Outline {
  notes: string
  acts: Act[]
}

export interface OutlineDocument {
  outline: Outline
  /** Hash of `outline.md` – send it back with changes to detect edits made elsewhere. */
  hash: string
}

const Title = z.string().trim().min(1).max(200)

/** Structural edits of the outline, applied in order (tree view, board drag & drop, tools). */
export const OutlineOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('addAct'), id: ActIdSchema.optional(), title: Title, index: z.number().int().min(0).optional() }),
  z.object({ op: z.literal('renameAct'), actId: ActIdSchema, title: Title }),
  z.object({ op: z.literal('deleteAct'), actId: ActIdSchema }),
  z.object({ op: z.literal('moveAct'), actId: ActIdSchema, index: z.number().int().min(0) }),
  z.object({ op: z.literal('addBeat'), id: BeatIdSchema.optional(), actId: ActIdSchema, title: Title, summary: z.string().max(20_000).default(''), index: z.number().int().min(0).optional() }),
  z.object({ op: z.literal('updateBeat'), beatId: BeatIdSchema, title: Title.optional(), summary: z.string().max(20_000).optional(), scenes: z.array(z.string().regex(/^scn_[a-z0-9]+$/)).max(100).optional() }),
  z.object({ op: z.literal('deleteBeat'), beatId: BeatIdSchema }),
  z.object({ op: z.literal('moveBeat'), beatId: BeatIdSchema, actId: ActIdSchema, index: z.number().int().min(0) }),
  z.object({ op: z.literal('setNotes'), notes: z.string().max(100_000) }),
])
export type OutlineOp = z.infer<typeof OutlineOpSchema>

export const ApplyOutlineOpsSchema = z.object({
  ops: z.array(OutlineOpSchema).min(1).max(100),
  expectedHash: z.string().optional(),
})

/** A beat-sheet template: a Markdown file in the outline format (`templates/beat-sheets/<id>.md` in the workspace). */
export interface BeatSheet {
  /** File name without `.md`. */
  id: string
  title: string
  description: string
  outline: Outline
}

export interface BeatSheetList {
  /** Absolute path of the folder holding the templates (shown so people can edit them). */
  folder: string
  sheets: BeatSheet[]
}
