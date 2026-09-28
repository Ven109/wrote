import { z } from 'zod'
import { dismissFinding } from '../../../../../services/review-findings'

const ParamsSchema = z.object({ commentId: z.string().regex(/^cmt_[a-z0-9]+$/) })

/** Dismisses a review finding: hidden, and not raised again by its agent. */
export default defineEventHandler(async (event) => {
  const { commentId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => dismissFinding(book, commentId))
})
