import { UpdateAiSettingsSchema } from '#shared/schemas/ai'
import { updateAiSettings } from '../../../services/ai-settings'
import { withEmbeddingRefresh } from '../../../services/embeddings'
import { withSummaryRefresh } from '../../../services/summary-jobs'
import { openBooks } from '../../../services/workspace'

/**
 * Updates providers, default models, background AI settings and (write-only) API keys. A new embedding
 * model re-embeds open books; turning summaries on (or a new fast model) refreshes their summaries.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, UpdateAiSettingsSchema.parse)
  const workspaceDir = useWorkspaceDir(event)
  const books = openBooks()
  return withEmbeddingRefresh(workspaceDir, books, () => withSummaryRefresh(workspaceDir, books, () => updateAiSettings(workspaceDir, input)))
})
