import { z } from 'zod'
import type { SceneStatusSchema } from './entry'
import { EntryIdSchema } from './entry'

export const StructureNodeTypeSchema = z.enum(['part', 'chapter', 'scene'])

export interface StructureNode {
  id: string
  type: 'part' | 'chapter' | 'scene'
  title: string
  path: string
  wordCount: number
  status?: z.infer<typeof SceneStatusSchema>
  children: StructureNode[]
}

export const CreateNodeSchema = z.object({
  type: StructureNodeTypeSchema,
  title: z.string().trim().min(1).max(200),
  /** Parent part/chapter id; omit for a new part. */
  parentId: EntryIdSchema.optional(),
})

export const MoveNodeSchema = z.object({
  /** New parent (part for chapters, chapter for scenes); omit to keep the current parent. */
  parentId: EntryIdSchema.optional(),
  /** Zero-based position among the new siblings. */
  index: z.number().int().min(0),
})

export const RenameNodeSchema = z.object({ title: z.string().trim().min(1).max(200) })
