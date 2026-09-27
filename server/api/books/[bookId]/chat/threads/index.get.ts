import { listThreads } from '../../../../../db/state/chat'

/** Assistant chat threads of the book, most recent first. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return listThreads(book.state)
})
