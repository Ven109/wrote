import type { ToolPolicyPatch } from '../../shared/schemas/permissions'

type Post = (url: string, options: { method: 'POST', body: unknown }) => Promise<unknown>

/** Creates an MCP client via the settings API and returns its (one-time) token. */
export async function createMcpToken(post: Post, name = 'Test agent', policy?: ToolPolicyPatch): Promise<string> {
  const created = await post('/api/settings/mcp/clients', { method: 'POST', body: { name, policy } }) as { token: string }
  return created.token
}
