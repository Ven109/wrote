import { AutocompleteRequestSchema } from '#shared/schemas/inline-ai'
import { getModelWithRef } from '../../../../ai/models'
import { loadAiConfig } from '../../../../services/ai-settings'
import { completeText } from '../../../../services/inline-ai'

/** Ghost-text completion at the cursor (fast model). 409 when autocomplete is switched off. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, AutocompleteRequestSchema.parse)
  const workspaceDir = useWorkspaceDir(event)
  const config = await loadAiConfig(workspaceDir)
  const configured = config.settings.autocomplete ? await getModelWithRef(workspaceDir, 'fast') : null
  if (!configured) throw createError({ statusCode: 409, statusMessage: 'Autocomplete is off', data: { code: 'autocomplete_off' } })
  const book = await requireBook(event)
  const controller = new AbortController()
  event.node.req.on('close', () => controller.abort())
  return { text: await withStorageErrors(() => completeText(book, input, configured, controller.signal)) }
})
