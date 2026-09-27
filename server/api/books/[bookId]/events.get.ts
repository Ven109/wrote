import { subscribeBookEvents } from '../../../utils/book-events'

/** Server-sent events stream of file changes in a book. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  const stream = createEventStream(event)
  const unsubscribe = subscribeBookEvents(book.id, (change) => {
    void stream.push({ event: 'change', data: JSON.stringify(change) })
  })
  // Flush headers immediately so clients know the stream is live.
  void stream.push({ event: 'ready', data: JSON.stringify({ bookId: book.id }) })
  stream.onClosed(async () => {
    unsubscribe()
    await stream.close()
  })
  return stream.send()
})
