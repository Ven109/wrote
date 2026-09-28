import { TimelineQuerySchema } from '#shared/schemas/timeline'
import { buildTimeline } from '../../../../services/timeline'

/** Scenes and events in in-world order (optionally filtered by character, place, range), undated ones apart. */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, TimelineQuerySchema.parse)
  const book = await requireBook(event)
  return buildTimeline(book, query)
})
