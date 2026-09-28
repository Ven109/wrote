import { CreateCommentSchema } from '#shared/schemas/comments'
import { AUTHOR } from '../../../../services/activity'
import { addComment } from '../../../../services/comments'

/** The author comments on a passage. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, CreateCommentSchema.parse)
  const book = await requireBook(event)
  setResponseStatus(event, 201)
  return withStorageErrors(() => addComment(book, { ...input, author: AUTHOR }))
})
