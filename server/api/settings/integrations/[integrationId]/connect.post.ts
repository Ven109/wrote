import { z } from 'zod'
import { IntegrationIdSchema } from '#shared/schemas/integrations'
import { reconnectIntegration } from '../../../../services/integrations'
import { oauthRedirectUrl } from '../../../../utils/integrations'

const ParamsSchema = z.object({ integrationId: IntegrationIdSchema })

/** Reconnects an integration and lists its tools again ("Connect" / "Test"). */
export default defineEventHandler(async (event) => {
  const { integrationId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  return withStorageErrors(() => reconnectIntegration(useWorkspaceDir(event), integrationId, oauthRedirectUrl(event)))
})
