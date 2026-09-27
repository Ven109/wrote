import { getThread, threadMessages } from '../../../../../../db/state/chat'

/** Stored UI messages of a thread (to resume a conversation). */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  const id = getRouterParam(event, 'threadId') ?? ''
  if (!await getThread(book.state, id)) throw createError({ statusCode: 404, statusMessage: 'Thread not found', data: { code: 'not_found' } })
  return threadMessages(book.state, id)
})
