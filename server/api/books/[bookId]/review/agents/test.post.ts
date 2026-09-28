import { TestAgentSchema, type PreviewFinding } from '#shared/schemas/review'
import { previewAgent, reviewWith } from '../../../../../services/review-runs'
import { reviewRoute } from '../../../../../ai/models'

/** "Test on scene": runs an agent (saved or a draft) on one scene and returns its findings; nothing is stored. */
export default defineEventHandler(async (event) => {
  const { agent, sceneId } = await readValidatedBody(event, TestAgentSchema.parse)
  const book = await requireBook(event)
  const { model, ref } = await requireChatModel(book.workspaceDir, reviewRoute(agent.task), { bookId: book.id, feature: 'review' })
  const result = await withStorageErrors(() => previewAgent(book, { ...agent, source: 'book' }, sceneId, { review: reviewWith(model), model: ref }))
  const findings: PreviewFinding[] = result.findings.map(({ quote, severity, category, message, suggestion }) => ({ quote, severity, category, message, suggestion }))
  return { scene: result.scene, findings, summary: result.summary }
})
