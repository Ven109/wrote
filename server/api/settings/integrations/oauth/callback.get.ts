import { z } from 'zod'
import { completeSignIn } from '../../../../services/integrations'
import { oauthRedirectUrl } from '../../../../utils/integrations'

const QuerySchema = z.object({ code: z.string().min(1).max(2000), state: z.string().min(1).max(200) })

/** Where an MCP server's sign-in returns to: finishes OAuth, then back to Integrations. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  if (typeof query.error === 'string') return sendRedirect(event, `/settings/integrations?error=${encodeURIComponent(query.error)}`)
  const { code, state } = await getValidatedQuery(event, QuerySchema.parse)
  try {
    const id = await completeSignIn(useWorkspaceDir(event), { code, state, redirectUrl: oauthRedirectUrl(event) })
    return sendRedirect(event, `/settings/integrations?connected=${encodeURIComponent(id)}`)
  }
  catch (error) {
    return sendRedirect(event, `/settings/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'Sign-in failed')}`)
  }
})
