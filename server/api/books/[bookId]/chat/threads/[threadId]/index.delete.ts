import { deleteThread } from '../../../../../../db/state/chat'

/** Deletes a thread and its messages. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  const deleted = await deleteThread(book.state, getRouterParam(event, 'threadId') ?? '')
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Thread not found', data: { code: 'not_found' } })
  setResponseStatus(event, 204)
  return null
})
