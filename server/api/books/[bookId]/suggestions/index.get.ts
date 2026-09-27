import { SuggestionQuerySchema } from '#shared/schemas/suggestion'
import { listSuggestions } from '../../../../services/suggestions'

/** Suggestions of the book or one entry (`?entryId=`, `?status=`), pending ones flagged `stale` when their anchor is gone. */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, SuggestionQuerySchema.parse)
  const book = await requireBook(event)
  return listSuggestions(book, query)
})
