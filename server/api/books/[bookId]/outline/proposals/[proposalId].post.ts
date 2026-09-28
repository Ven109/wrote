import { z } from 'zod'
import { ResolveOutlineProposalSchema } from '#shared/schemas/outline-proposals'
import { resolveOutlineProposal } from '../../../../../services/outline-proposals'

const ParamsSchema = z.object({ proposalId: z.string().regex(/^opr_[a-z0-9]+$/) })

/** Accepts (with optional edits of title and summary) or rejects an outline proposal. */
export default defineEventHandler(async (event) => {
  const { proposalId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const input = await readValidatedBody(event, ResolveOutlineProposalSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => resolveOutlineProposal(book, proposalId, input))
})
