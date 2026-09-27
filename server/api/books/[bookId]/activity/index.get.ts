import { ActivityFilterSchema } from '#shared/schemas/activity'
import { listActivity } from '../../../../services/activity'

/** The book's activity log (AI/MCP tool calls that change data, and undos), newest first. */
export default defineEventHandler(async (event) => {
  const filter = await getValidatedQuery(event, ActivityFilterSchema.parse)
  const book = await requireBook(event)
  return listActivity(book, filter)
})
