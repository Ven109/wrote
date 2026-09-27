import { createThread } from '../../../../../db/state/chat'

/** Starts a new, empty chat thread (titled after its first message). */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  setResponseStatus(event, 201)
  return createThread(book.state, 'New chat', new Date())
})
