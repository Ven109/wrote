import { z } from 'zod'
import { ResolveCodexProposalSchema } from '#shared/schemas/codex-proposals'
import { resolveCodexProposal } from '../../../../../services/codex-proposals'

const ParamsSchema = z.object({ proposalId: z.string().regex(/^cxp_[a-z0-9]+$/) })

/** Accepts (with optional edits) or rejects a codex proposal. */
export default defineEventHandler(async (event) => {
  const { proposalId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const input = await readValidatedBody(event, ResolveCodexProposalSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => resolveCodexProposal(book, proposalId, input))
})
