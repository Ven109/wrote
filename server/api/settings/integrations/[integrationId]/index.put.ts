import { z } from 'zod'
import { IntegrationIdSchema, SaveIntegrationSchema } from '#shared/schemas/integrations'
import { saveIntegration } from '../../../../services/integrations'
import { oauthRedirectUrl } from '../../../../utils/integrations'

const ParamsSchema = z.object({ integrationId: IntegrationIdSchema })

/** Updates an integration (settings, secrets, policy) and reconnects it. */
export default defineEventHandler(async (event) => {
  const { integrationId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const input = await readValidatedBody(event, SaveIntegrationSchema.parse)
  if (input.id !== integrationId) throw createError({ statusCode: 400, statusMessage: 'The id does not match the URL' })
  return withStorageErrors(() => saveIntegration(useWorkspaceDir(event), input, { create: false, redirectUrl: oauthRedirectUrl(event) }))
})
