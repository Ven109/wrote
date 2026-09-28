import { OutlineProposalQuerySchema } from '#shared/schemas/outline-proposals'
import { listOutlineProposals } from '../../../../../services/outline-proposals'

/** Proposed outline changes (ghost beats and notes), filtered by status. */
export default defineEventHandler(async (event) => {
  const filter = await getValidatedQuery(event, OutlineProposalQuerySchema.parse)
  const book = await requireBook(event)
  return listOutlineProposals(book, filter)
})
