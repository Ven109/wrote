import { StartReviewSchema } from '#shared/schemas/review'
import { getModelWithRef } from '../../../../ai/models'
import { estimateReview, planReview } from '../../../../services/review-runs'

/** Size of a review run before starting it: scenes, model calls, tokens. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, StartReviewSchema.parse)
  const book = await requireBook(event)
  const plan = await withStorageErrors(() => planReview(book, input))
  const model = (await getModelWithRef(book.workspaceDir, plan.agent.task))?.ref ?? 'unknown'
  return estimateReview(book, plan, model)
})
