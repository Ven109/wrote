import { z } from 'zod'
import { diffSnapshot } from '../../../../../services/snapshots'

const ParamsSchema = z.object({ snapshotId: z.string().min(1).max(40) })
const QuerySchema = z.object({ path: z.string().max(500).optional() })

/** The snapshot's files that differ from now (snapshot and current content, current hash). */
export default defineEventHandler(async (event) => {
  const { snapshotId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const { path } = await getValidatedQuery(event, QuerySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => diffSnapshot(book, snapshotId, path))
})
