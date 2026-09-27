import { z } from 'zod'
import { TOOL_PERMISSIONS } from './permissions'
import { ActorSchema } from './suggestion'

/** One book file a tool call changed: its raw content before and after (`null` = did not exist). */
export const FileChangeSchema = z.object({
  path: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
})
export type FileChange = z.infer<typeof FileChangeSchema>

/**
 * A logged tool call that could change data (every non-read call by the assistant or an MCP agent), and undos
 * of such calls. `changes` holds the file states needed to show a diff and to undo it.
 */
export const ActivityEntrySchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  actor: ActorSchema,
  tool: z.string(),
  toolTitle: z.string(),
  permission: z.enum(TOOL_PERMISSIONS),
  input: z.unknown(),
  /** The tool's result (ids, paths) – shown for context. */
  output: z.unknown().optional(),
  changes: z.array(FileChangeSchema).default([]),
  /** False when the call did something that cannot be restored from file states (e.g. moving folders). */
  undoable: z.boolean().default(true),
  undoneAt: z.iso.datetime().nullable().default(null),
  /** Set on the entry that records an undo: the entry it reverted. */
  undoOf: z.string().nullable().default(null),
})
export type ActivityEntry = z.infer<typeof ActivityEntrySchema>

export const ActivityFilterSchema = z.object({
  actor: z.enum(['assistant', 'mcp', 'user', 'agent']).optional(),
  tool: z.string().max(100).optional(),
  since: z.iso.datetime().optional(),
  until: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})
export type ActivityFilter = z.infer<typeof ActivityFilterSchema>

export const UndoActivitySchema = z.object({
  /** Undo even though a file was edited since (those edits are lost). */
  force: z.boolean().default(false),
})
export type UndoActivityInput = z.infer<typeof UndoActivitySchema>

/** SSE payload: a new or updated activity entry. */
export interface ActivityEvent {
  entry: ActivityEntry
}
