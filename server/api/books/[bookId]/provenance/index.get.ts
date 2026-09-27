import { ProvenanceQuerySchema } from '#shared/schemas/provenance'
import { loadAiConfig } from '../../../../services/ai-settings'
import { entryProvenance } from '../../../../services/provenance'

/** AI-assisted passages of an entry as they are now, with the entry's AI-assisted share. */
export default defineEventHandler(async (event) => {
  const { entryId } = await getValidatedQuery(event, ProvenanceQuerySchema.parse)
  const book = await requireBook(event)
  const { settings } = await loadAiConfig(useWorkspaceDir(event))
  return withStorageErrors(() => entryProvenance(book, entryId, settings.provenanceThreshold))
})
