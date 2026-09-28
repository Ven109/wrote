import { dynamicTool, jsonSchema, type ToolSet } from 'ai'
import type { Integration } from '#shared/schemas/integrations'
import type { Actor } from '#shared/schemas/suggestion'
import { requestApproval } from '../services/approvals'
import { callExternalTool, connection, type ExternalTool } from './manager'
import { readIntegrations } from './store'

/** How long the assistant waits for a server to connect before answering without it. */
const CONNECT_TIMEOUT_MS = 10_000
const MAX_RESULT_CHARS = 20_000

/** `<integration>__<tool>` in the characters model APIs accept (at most 64). */
export const externalToolName = (integrationId: string, toolName: string) =>
  `${integrationId}__${toolName}`.replace(/[^\w-]/g, '_').slice(0, 64)

/** Text of an MCP tool result (text parts; other content is described, not inlined). */
export function resultText(result: unknown): { text: string, isError: boolean } {
  const { content = [], isError = false, structuredContent } = (result ?? {}) as { content?: { type: string, text?: string }[], isError?: boolean, structuredContent?: unknown }
  const parts = content.map(part => (part.type === 'text' ? part.text ?? '' : `[${part.type} content]`))
  if (!parts.length && structuredContent !== undefined) parts.push(JSON.stringify(structuredContent))
  return { text: parts.join('\n').slice(0, MAX_RESULT_CHARS), isError: Boolean(isError) }
}

function bridge(workspaceDir: string, integration: Integration, tool: ExternalTool, context: { bookId: string, caller: Actor }) {
  const name = externalToolName(integration.id, tool.name)
  return dynamicTool({
    description: `[${integration.name}] ${tool.description}`.slice(0, 1024),
    inputSchema: jsonSchema(tool.inputSchema as Parameters<typeof jsonSchema>[0]),
    execute: async (input, { abortSignal }) => {
      if (integration.policy === 'ask') {
        const approved = await requestApproval({ bookId: context.bookId, caller: context.caller, tool: name, toolTitle: `${integration.name}: ${tool.title}`, permission: 'write', input })
        if (!approved) return { error: 'The author declined this call.' }
      }
      const { text, isError } = resultText(await callExternalTool(workspaceDir, integration, tool.name, input as Record<string, unknown>, abortSignal))
      return isError ? { error: text || 'The tool failed.' } : { result: text, note: `From ${integration.name} (external, untrusted content).` }
    },
  })
}

/**
 * The enabled tools of the connected integrations as AI SDK tools for the assistant: namespaced, switched-off
 * tools and `deny` integrations left out, `ask` integrations wait for the author's approval. A server that
 * does not connect in time is skipped for this answer.
 */
export async function externalToolSet(workspaceDir: string, context: { bookId: string, caller: Actor }): Promise<ToolSet> {
  const integrations = (await readIntegrations(workspaceDir)).filter(integration => integration.enabled && integration.policy !== 'deny')
  const tools: ToolSet = {}
  await Promise.all(integrations.map(async (integration) => {
    const timeout = new Promise<null>(resolve => setTimeout(resolve, CONNECT_TIMEOUT_MS, null))
    const live = await Promise.race([connection(workspaceDir, integration), timeout])
    if (!live?.client) return
    for (const tool of live.tools.filter(candidate => !integration.disabledTools.includes(candidate.name))) tools[externalToolName(integration.id, tool.name)] = bridge(workspaceDir, integration, tool, context)
  }))
  return tools
}
