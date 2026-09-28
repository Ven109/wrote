import { SnapshotListQuerySchema } from '#shared/schemas/snapshot'
import { listSnapshotSummaries } from '../../../../services/snapshots'

/** Snapshots of the book, newest first; `?path=` only those holding that file. */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, SnapshotListQuerySchema.parse)
  const book = await requireBook(event)
  return listSnapshotSummaries(book, query)
})
