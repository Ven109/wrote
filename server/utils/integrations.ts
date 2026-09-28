import type { H3Event } from 'h3'

/** The OAuth callback URL of this app (the origin the author uses), for remote MCP server sign-ins. */
export function oauthRedirectUrl(event: H3Event): string {
  return new URL('/api/settings/integrations/oauth/callback', getRequestURL(event).origin).toString()
}
