import { z } from 'zod'
import { DecideApprovalSchema } from '#shared/schemas/permissions'
import { decideApproval } from '../../../../services/approvals'

const ParamsSchema = z.object({ approvalId: z.string().regex(/^apr_[a-z0-9]+$/) })

/** The author approves or denies a waiting tool call. 404 when it is no longer waiting. */
export default defineEventHandler(async (event) => {
  const { approvalId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const { approve } = await readValidatedBody(event, DecideApprovalSchema.parse)
  await requireBook(event)
  if (!decideApproval(approvalId, approve)) throw createError({ statusCode: 404, statusMessage: 'This request is no longer waiting', data: { code: 'not_found' } })
  return { approved: approve }
})
