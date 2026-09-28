import { z } from 'zod'

export const IntegrationIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/)
export const IntegrationPolicySchema = z.enum(['allow', 'ask', 'deny'])
export type IntegrationPolicy = z.infer<typeof IntegrationPolicySchema>

const KeySchema = z.string().trim().min(1).max(200)

/**
 * An external MCP server the assistant can use (web search, Zotero, …). Stored in the workspace
 * (`.wrote/integrations.json`), never in a book folder; env and header values live in a separate
 * owner-only secrets file and are never sent back to the browser.
 */
export const IntegrationSchema = z.object({
  id: IntegrationIdSchema,
  name: z.string().trim().min(1).max(100),
  transport: z.enum(['http', 'stdio']),
  /** Streamable HTTP endpoint (http transport). */
  url: z.url().nullable().default(null),
  /** Command and arguments to start a local server (stdio transport). */
  command: z.string().trim().max(500).nullable().default(null),
  args: z.array(z.string().max(1000)).max(50).default([]),
  /** Names of environment variables (stdio) or HTTP headers (http) whose values are secrets. */
  envKeys: z.array(KeySchema).max(50).default([]),
  headerKeys: z.array(KeySchema).max(50).default([]),
  enabled: z.boolean().default(true),
  /** What happens when the assistant calls one of its tools: run, ask the author first, or never offer it. */
  policy: IntegrationPolicySchema.default('ask'),
  /** Tools switched off (not offered to the model). */
  disabledTools: z.array(z.string()).default([]),
})
export type Integration = z.infer<typeof IntegrationSchema>

export const SaveIntegrationSchema = IntegrationSchema.extend({
  /** New secret values by key; keys missing here keep their stored value, `null` removes one. */
  env: z.record(KeySchema, z.string().max(10_000).nullable()).default({}),
  headers: z.record(KeySchema, z.string().max(10_000).nullable()).default({}),
}).superRefine((value, context) => {
  if (value.transport === 'http' && !value.url) context.addIssue({ code: 'custom', path: ['url'], message: 'An HTTP server needs a URL' })
  if (value.transport === 'stdio' && !value.command) context.addIssue({ code: 'custom', path: ['command'], message: 'A local server needs a command' })
})
export type SaveIntegrationInput = z.infer<typeof SaveIntegrationSchema>

export const INTEGRATION_STATES = ['disconnected', 'connecting', 'connected', 'needs-auth', 'error'] as const
export type IntegrationState = (typeof INTEGRATION_STATES)[number]

export interface IntegrationTool {
  name: string
  title: string
  description: string
  enabled: boolean
}

/** An integration as the settings page shows it: status and tools, and which secrets are set (not their values). */
export interface IntegrationView extends Integration {
  state: IntegrationState
  error: string | null
  /** Where to sign in (OAuth) when `state` is `needs-auth`. */
  authUrl: string | null
  tools: IntegrationTool[]
  secretsSet: string[]
}

export const SetToolEnabledSchema = z.object({ enabled: z.boolean() })
