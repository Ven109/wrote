import { SaveIntegrationSchema } from '#shared/schemas/integrations'
import { saveIntegration } from '../../../services/integrations'
import { oauthRedirectUrl } from '../../../utils/integrations'

/** Adds an external MCP server and connects it (201). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, SaveIntegrationSchema.parse)
  const view = await withStorageErrors(() => saveIntegration(useWorkspaceDir(event), input, { create: true, redirectUrl: oauthRedirectUrl(event) }))
  setResponseStatus(event, 201)
  return view
})
