import { CodexProposalQuerySchema } from '#shared/schemas/codex-proposals'
import { listCodexProposals } from '../../../../../services/codex-proposals'

/** Codex proposals from "Scan chapter", filtered by status and scanned entry. */
export default defineEventHandler(async (event) => {
  const filter = await getValidatedQuery(event, CodexProposalQuerySchema.parse)
  const book = await requireBook(event)
  return listCodexProposals(book, filter)
})
