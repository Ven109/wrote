import { z } from 'zod'
import { IntegrationIdSchema } from '#shared/schemas/integrations'
import { deleteIntegration } from '../../../../services/integrations'

const ParamsSchema = z.object({ integrationId: IntegrationIdSchema })

/** Removes an integration, its secrets and its connection (a local server is stopped). */
export default defineEventHandler(async (event) => {
  const { integrationId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  await withStorageErrors(() => deleteIntegration(useWorkspaceDir(event), integrationId))
  setResponseStatus(event, 204)
})
