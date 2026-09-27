import { z } from 'zod'
import { ContextOverridesSchema } from './context'
import { EntryPathSchema } from './document'

export interface ChatThread {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

/** What the user is looking at, sent with every message so "this scene" needs no naming. */
export const ChatContextSchema = z.object({
  entryPath: EntryPathSchema.optional(),
  selection: z.string().max(4000).optional(),
  /** The author's changes in the context drawer (pinned / removed items). */
  overrides: ContextOverridesSchema.optional(),
})

/** Metadata of assistant messages: the context snapshot of the request that produced it. */
export interface AssistantMessageMetadata {
  contextSnapshotId?: string
}
export type ChatContext = z.infer<typeof ChatContextSchema>

/** Body of POST /api/books/:bookId/chat (AI SDK chat transport + our fields). */
export const ChatRequestSchema = z.object({
  threadId: z.string().regex(/^thr_[a-z0-9]+$/),
  /** UI messages as sent by the AI SDK Chat (validated by the AI SDK). */
  messages: z.array(z.looseObject({ id: z.string(), role: z.enum(['system', 'user', 'assistant']) })).min(1).max(500),
  context: ChatContextSchema.default({}),
})
