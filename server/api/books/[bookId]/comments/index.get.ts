import { CommentQuerySchema } from '#shared/schemas/comments'
import { listComments } from '../../../../services/comments'

/** Comments of the book or an entry (open ones unless `includeResolved=true`). */
export default defineEventHandler(async (event) => {
  const filter = await getValidatedQuery(event, CommentQuerySchema.parse)
  const book = await requireBook(event)
  return listComments(book, filter)
})
