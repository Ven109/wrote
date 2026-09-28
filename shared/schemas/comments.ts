import { z } from 'zod'
import { FindingInfoSchema } from './review'
import { ActorSchema } from './suggestion'

export const CommentReplySchema = z.object({
  id: z.string(),
  author: ActorSchema,
  body: z.string().min(1).max(10_000),
  createdAt: z.iso.datetime(),
})
export type CommentReply = z.infer<typeof CommentReplySchema>

/**
 * A comment on a passage of an entry (author notes, editor critique from agents). `quote` anchors it like a
 * suggestion's `find`, with the surrounding text in `before`/`after`, so it survives nearby edits. Comments
 * never change the text. Review agents' findings are comments with `review` set.
 */
export const CommentSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  quote: z.string().min(1),
  before: z.string().default(''),
  after: z.string().default(''),
  body: z.string().min(1).max(10_000),
  author: ActorSchema,
  replies: z.array(CommentReplySchema).default([]),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().nullable().default(null),
  /** Set when the comment is a review agent's finding. */
  review: FindingInfoSchema.nullable().default(null),
})
export type Comment = z.infer<typeof CommentSchema>

/** A comment as listed: `detached` when its passage is no longer in the entry. */
export type CommentView = Comment & { detached: boolean }

export const CreateCommentSchema = z.object({
  entryId: z.string().regex(/^[a-z]{3}_[a-z0-9]+$/),
  quote: z.string().min(1).max(2000),
  body: z.string().trim().min(1).max(10_000),
})
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>

export const ReplyCommentSchema = z.object({ body: z.string().trim().min(1).max(10_000) })
export const ResolveCommentSchema = z.object({ resolved: z.boolean() })

export const CommentQuerySchema = z.object({
  entryId: z.string().optional(),
  includeResolved: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
})

/** SSE payload: comments of an entry changed. */
export interface CommentEvent {
  entryId: string
}
