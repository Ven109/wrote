import { randomBytes } from 'node:crypto'
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js'
import type { OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js'
import type { Integration } from '#shared/schemas/integrations'
import { readSecrets, updateSecrets } from './store'

/** Authorization URLs waiting for the author to sign in, by integration id. */
const pending = new Map<string, string>()
export const pendingAuthUrl = (id: string) => pending.get(id) ?? null
export const clearPendingAuth = (id: string) => pending.delete(id)

type OAuthState = { client?: OAuthClientInformationMixed, tokens?: OAuthTokens, verifier?: string, state?: string, redirectUrl?: string }
const oauthOf = async (workspaceDir: string, id: string) => (await readSecrets(workspaceDir, id)).oauth as OAuthState
const saveOAuth = (workspaceDir: string, id: string, patch: Partial<OAuthState> | ((current: OAuthState) => OAuthState)) =>
  updateSecrets(workspaceDir, id, secrets => ({ ...secrets, oauth: typeof patch === 'function' ? patch(secrets.oauth as OAuthState) : { ...secrets.oauth, ...patch } }))

/**
 * OAuth for a remote MCP server (dynamic client registration, PKCE, refresh via the MCP SDK). Everything is
 * kept in the owner-only secrets file. When the server needs a sign-in, the authorization URL is kept for the
 * settings page to open; the callback route finishes the flow.
 */
export function integrationAuthProvider(workspaceDir: string, integration: Integration, redirectUrl: string): OAuthClientProvider {
  const id = integration.id
  return {
    get redirectUrl() {
      return redirectUrl
    },
    get clientMetadata() {
      return { client_name: 'Wrote', redirect_uris: [redirectUrl], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none' }
    },
    async state() {
      const state = `${id}.${randomBytes(16).toString('hex')}`
      await saveOAuth(workspaceDir, id, { state, redirectUrl })
      return state
    },
    clientInformation: async () => (await oauthOf(workspaceDir, id)).client,
    saveClientInformation: client => saveOAuth(workspaceDir, id, { client }),
    tokens: async () => (await oauthOf(workspaceDir, id)).tokens,
    saveTokens: tokens => saveOAuth(workspaceDir, id, { tokens }),
    redirectToAuthorization: (url) => {
      pending.set(id, url.toString())
    },
    saveCodeVerifier: verifier => saveOAuth(workspaceDir, id, { verifier }),
    async codeVerifier() {
      const verifier = (await oauthOf(workspaceDir, id)).verifier
      if (!verifier) throw new Error('No sign-in in progress for this server')
      return verifier
    },
    invalidateCredentials: scope => saveOAuth(workspaceDir, id, current => ({
      ...current,
      ...(scope === 'all' || scope === 'client' ? { client: undefined } : {}),
      ...(scope === 'all' || scope === 'tokens' ? { tokens: undefined } : {}),
      ...(scope === 'all' || scope === 'verifier' ? { verifier: undefined } : {}),
    })),
  }
}

/** The redirect URL used last (connections from the assistant have no request to derive it from). */
export const storedRedirectUrl = async (workspaceDir: string, id: string) => (await oauthOf(workspaceDir, id)).redirectUrl

/** Checks the `state` of an OAuth callback against the one sent; returns the integration id. */
export async function verifyOAuthState(workspaceDir: string, state: string): Promise<string | null> {
  const id = state.split('.')[0] ?? ''
  if (!id) return null
  const stored = (await oauthOf(workspaceDir, id)).state
  return stored && stored === state ? id : null
}
