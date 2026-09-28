import { z } from 'zod'
import { deleteSnapshot } from '../../../../../services/snapshots'

const ParamsSchema = z.object({ snapshotId: z.string().min(1).max(40) })

export default defineEventHandler(async (event) => {
  const { snapshotId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const book = await requireBook(event)
  await withStorageErrors(() => deleteSnapshot(book, snapshotId))
  setResponseStatus(event, 204)
  return null
})
