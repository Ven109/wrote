import { EnqueueJobSchema } from '#shared/schemas/jobs'

/** Enqueues a background job (`kind` + job-specific `input`). Responds immediately with the queued job. */
export default defineEventHandler(async (event) => {
  const { kind, input } = await readValidatedBody(event, EnqueueJobSchema.parse)
  const book = await requireBook(event)
  setResponseStatus(event, 202)
  return withStorageErrors(() => book.jobs.enqueue(kind, input))
})
