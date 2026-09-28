import { z } from 'zod'
import { RestoreSnapshotSchema } from '#shared/schemas/snapshot'
import { restoreSnapshot } from '../../../../../services/snapshot-restore'

const ParamsSchema = z.object({ snapshotId: z.string().min(1).max(40) })

/** Restores the snapshot, one file or chosen blocks; undoable (activity log + safety snapshot). 409 if the file changed. */
export default defineEventHandler(async (event) => {
  const { snapshotId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const input = await readValidatedBody(event, RestoreSnapshotSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => restoreSnapshot(book, snapshotId, input))
})
