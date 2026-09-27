import { loadAiConfig } from '../../../../services/ai-settings'
import { provenanceStats } from '../../../../services/provenance'

/** AI-assisted share of the manuscript: per scene, chapter and part, and for the book. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  const { settings } = await loadAiConfig(useWorkspaceDir(event))
  return provenanceStats(book, settings.provenanceThreshold)
})
