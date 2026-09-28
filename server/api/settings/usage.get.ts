import { UsageQuerySchema } from '#shared/schemas/usage'
import { listBooks } from '../../services/books'
import { usageReport } from '../../services/usage'

/** AI usage of the workspace (or one book): tokens and estimated cost by feature, model, book and month, plus the budget. */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, UsageQuerySchema.parse)
  const workspaceDir = useWorkspaceDir(event)
  const books = await listBooks(workspaceDir)
  return usageReport(workspaceDir, query, new Map(books.map(book => [book.id, book.title])))
})
