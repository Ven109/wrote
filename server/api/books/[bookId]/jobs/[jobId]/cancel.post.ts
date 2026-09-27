/** Cancels a queued or running job. */
export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId') ?? ''
  const book = await requireBook(event)
  return withStorageErrors(() => book.jobs.cancel(jobId))
})
