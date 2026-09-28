import { z } from 'zod'
import { IntegrationIdSchema, SetToolEnabledSchema } from '#shared/schemas/integrations'
import { setToolEnabled } from '../../../../../services/integrations'

const ParamsSchema = z.object({ integrationId: IntegrationIdSchema, tool: z.string().min(1).max(200) })

/** Switches one of an integration's tools on or off for the assistant. */
export default defineEventHandler(async (event) => {
  const { integrationId, tool } = await getValidatedRouterParams(event, ParamsSchema.parse, { decode: true })
  const { enabled } = await readValidatedBody(event, SetToolEnabledSchema.parse)
  return withStorageErrors(() => setToolEnabled(useWorkspaceDir(event), integrationId, tool, enabled))
})
