import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { MoveOnTimelineSchema } from '#shared/schemas/timeline'
import { moveOnTimeline } from '../../../../services/timeline'

const ParamsSchema = z.object({ entryId: EntryIdSchema })

/** Moves a scene or event in time (drag on the timeline); the date keeps its format. */
export default defineEventHandler(async (event) => {
  const { entryId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const { key } = await readValidatedBody(event, MoveOnTimelineSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => moveOnTimeline(book, entryId, key))
})
