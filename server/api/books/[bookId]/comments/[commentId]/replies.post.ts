import { z } from 'zod'
import { ReplyCommentSchema } from '#shared/schemas/comments'
import { AUTHOR } from '../../../../../services/activity'
import { replyToComment } from '../../../../../services/comments'

const ParamsSchema = z.object({ commentId: z.string().regex(/^cmt_[a-z0-9]+$/) })

/** The author replies to a comment. */
export default defineEventHandler(async (event) => {
  const { commentId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const { body } = await readValidatedBody(event, ReplyCommentSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => replyToComment(book, commentId, { body, author: AUTHOR }))
})
