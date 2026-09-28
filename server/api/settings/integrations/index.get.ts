import { listIntegrations } from '../../../services/integrations'
import { oauthRedirectUrl } from '../../../utils/integrations'

/** External MCP servers with their status and tools; enabled ones that are not connected are connected first. */
export default defineEventHandler(event => listIntegrations(useWorkspaceDir(event), { connect: true, redirectUrl: oauthRedirectUrl(event) }))
