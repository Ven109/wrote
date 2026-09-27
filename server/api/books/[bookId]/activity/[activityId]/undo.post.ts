import { z } from 'zod'
import { UndoActivitySchema } from '#shared/schemas/activity'
import { undoActivity } from '../../../../../services/activity'

const ParamsSchema = z.object({ activityId: z.string().regex(/^act_[a-z0-9]+$/) })

/** Reverts a logged change. 409 when a file was edited since (retry with `force` to overwrite). */
export default defineEventHandler(async (event) => {
  const { activityId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const { force } = await readValidatedBody(event, body => UndoActivitySchema.parse(body ?? {}))
  const book = await requireBook(event)
  return withStorageErrors(() => undoActivity(book, activityId, { force }))
})
