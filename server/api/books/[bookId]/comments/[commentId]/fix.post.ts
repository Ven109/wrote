import { z } from 'zod'
import { suggestFindingFix } from '../../../../../services/review-findings'

const ParamsSchema = z.object({ commentId: z.string().regex(/^cmt_[a-z0-9]+$/) })

/** "Apply fix": turns a finding's suggested replacement into a suggestion to accept or reject (201). */
export default defineEventHandler(async (event) => {
  const { commentId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const book = await requireBook(event)
  const suggestion = await withStorageErrors(() => suggestFindingFix(book, commentId))
  setResponseStatus(event, 201)
  return suggestion
})
