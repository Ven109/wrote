import type { Comment, CommentView, CreateCommentInput } from '#shared/schemas/comments'
import type { Actor } from '#shared/schemas/suggestion'
import { createRecordId } from '#shared/utils/ids'
import { anchorContext, locateAnchor } from '#shared/utils/text-anchor'
import { findComments, upsertComment } from '../db/state/comments'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { publishCommentEvent } from '../utils/book-events'
import { getEntry } from './entries'
import type { BookContext } from './workspace'

async function bodyOf(book: BookContext, entryId: string): Promise<string | null> {
  return (await getEntry(book.db, book.repository, { id: entryId }).catch(() => null))?.body ?? null
}

async function save(book: BookContext, comment: Comment): Promise<Comment> {
  const saved = await upsertComment(book.state, comment)
  publishCommentEvent(book.id, { entryId: saved.entryId })
  return saved
}

/**
 * Comments on a passage. `quote` must occur exactly once in the entry (Markdown as read_entry returns it);
 * its surroundings are kept so the comment stays attached after nearby edits. The text is never changed.
 */
export async function addComment(book: BookContext, input: CreateCommentInput & { author: Actor }, now = new Date()): Promise<Comment> {
  const body = await bodyOf(book, input.entryId)
  if (body === null) throw new NotFoundError(`Entry ${input.entryId}`)
  const occurrences = body.split(input.quote).length - 1
  if (occurrences !== 1) throw new InvalidInputError(occurrences ? '`quote` occurs more than once – quote a longer passage' : '`quote` does not occur in the entry – copy it exactly from read_entry')
  const from = body.indexOf(input.quote)
  return save(book, {
    id: createRecordId('cmt', 10),
    entryId: input.entryId,
    quote: input.quote,
    ...anchorContext(body, { from, to: from + input.quote.length }),
    body: input.body,
    author: input.author,
    replies: [],
    createdAt: now.toISOString(),
    resolvedAt: null,
  })
}

/** Comments (open ones unless `includeResolved`), flagged `detached` when their passage is gone. */
export async function listComments(book: BookContext, filter: { entryId?: string, includeResolved?: boolean } = {}): Promise<CommentView[]> {
  const comments = await findComments(book.state, filter)
  const bodies = new Map<string, string | null>()
  const views: CommentView[] = []
  for (const comment of comments) {
    if (!bodies.has(comment.entryId)) bodies.set(comment.entryId, await bodyOf(book, comment.entryId))
    const body = bodies.get(comment.entryId) ?? null
    views.push({ ...comment, detached: body === null || !locateAnchor(body, comment.quote, comment) })
  }
  return views
}

async function existing(book: BookContext, id: string): Promise<Comment> {
  const [comment] = await findComments(book.state, { id })
  if (!comment) throw new NotFoundError(`Comment ${id}`)
  return comment
}

export async function replyToComment(book: BookContext, id: string, input: { body: string, author: Actor }, now = new Date()): Promise<Comment> {
  const comment = await existing(book, id)
  return save(book, { ...comment, replies: [...comment.replies, { id: createRecordId('rpl', 10), author: input.author, body: input.body, createdAt: now.toISOString() }] })
}

/** Resolves (hides) or reopens a comment. */
export async function resolveComment(book: BookContext, id: string, resolved: boolean, now = new Date()): Promise<Comment> {
  const comment = await existing(book, id)
  return save(book, { ...comment, resolvedAt: resolved ? now.toISOString() : null })
}
