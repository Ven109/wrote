import { ReviewRunQuerySchema } from '#shared/schemas/review'
import { listReviewRuns } from '../../../../../db/state/review-runs'

/** Review history, newest first; with `sceneId` the runs that covered that scene. */
export default defineEventHandler(async (event) => {
  const filter = await getValidatedQuery(event, ReviewRunQuerySchema.parse)
  const book = await requireBook(event)
  return listReviewRuns(book.state, filter)
})
