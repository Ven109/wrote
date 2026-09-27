import { subscribeActivityEvents, subscribeApprovalEvents, subscribeBookEvents, subscribeJobEvents, subscribeSuggestionEvents } from '../../../utils/book-events'

/** Server-sent events stream of a book: file changes (`change`), background jobs (`job`), suggestions (`suggestion`), tool calls awaiting approval (`approval`) and the activity log (`activity`). */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  const stream = createEventStream(event)
  const unsubscribeChanges = subscribeBookEvents(book.id, (change) => {
    void stream.push({ event: 'change', data: JSON.stringify(change) })
  })
  const unsubscribeJobs = subscribeJobEvents(book.id, (job) => {
    void stream.push({ event: 'job', data: JSON.stringify({ job }) })
  })
  const unsubscribeSuggestions = subscribeSuggestionEvents(book.id, (change) => {
    void stream.push({ event: 'suggestion', data: JSON.stringify(change) })
  })
  const unsubscribeApprovals = subscribeApprovalEvents(book.id, (change) => {
    void stream.push({ event: 'approval', data: JSON.stringify(change) })
  })
  const unsubscribeActivity = subscribeActivityEvents(book.id, (change) => {
    void stream.push({ event: 'activity', data: JSON.stringify(change) })
  })
  // Flush headers immediately so clients know the stream is live.
  void stream.push({ event: 'ready', data: JSON.stringify({ bookId: book.id }) })
  stream.onClosed(async () => {
    unsubscribeChanges()
    unsubscribeJobs()
    unsubscribeSuggestions()
    unsubscribeApprovals()
    unsubscribeActivity()
    await stream.close()
  })
  return stream.send()
})
