import { z } from 'zod'
import { getContextSnapshot } from '../../../../db/state/context-snapshots'

const ParamsSchema = z.object({ snapshotId: z.string().regex(/^ctx_[a-z0-9]+$/) })

/** The exact context sent with one AI request (context drawer). */
export default defineEventHandler(async (event) => {
  const { snapshotId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const book = await requireBook(event)
  const snapshot = await getContextSnapshot(book.state, snapshotId)
  if (!snapshot) throw createError({ statusCode: 404, statusMessage: 'Context snapshot not found', data: { code: 'not_found' } })
  return snapshot
})
