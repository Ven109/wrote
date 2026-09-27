import { ResolveSuggestionsSchema } from '#shared/schemas/suggestion'
import { resolveSuggestions } from '../../../../services/suggestions'

/** Records the author's decision on suggestions (the editor applies accepted text as a normal, undoable edit). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, ResolveSuggestionsSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => resolveSuggestions(book, input))
})
