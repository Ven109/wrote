import { UpdateAiSettingsSchema } from '#shared/schemas/ai'
import { updateAiSettings } from '../../../services/ai-settings'
import { withEmbeddingRefresh } from '../../../services/embeddings'
import { openBooks } from '../../../services/workspace'

/** Updates providers, default models and (write-only) API keys. A new embedding model re-embeds open books. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, UpdateAiSettingsSchema.parse)
  const workspaceDir = useWorkspaceDir(event)
  return withEmbeddingRefresh(workspaceDir, openBooks(), () => updateAiSettings(workspaceDir, input))
})
