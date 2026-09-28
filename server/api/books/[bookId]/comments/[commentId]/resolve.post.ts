import { z } from 'zod'
import { ResolveCommentSchema } from '#shared/schemas/comments'
import { resolveComment } from '../../../../../services/comments'

const ParamsSchema = z.object({ commentId: z.string().regex(/^cmt_[a-z0-9]+$/) })

/** Resolves (`resolved: true`) or reopens a comment. */
export default defineEventHandler(async (event) => {
  const { commentId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const { resolved } = await readValidatedBody(event, ResolveCommentSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => resolveComment(book, commentId, resolved))
})
