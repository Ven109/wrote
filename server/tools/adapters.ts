import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import { runTool, type ToolContext, type WroteTool } from './define'

/** Converts Wrote tools into an AI SDK tool set bound to a context (book + caller). */
export function toAiSdkTools(tools: readonly WroteTool[], context: ToolContext): ToolSet {
  return Object.fromEntries(tools
    .filter(t => !t.requiresBook || context.book)
    .map(t => [t.name, tool({
      description: t.description,
      inputSchema: t.input,
      execute: (input: unknown) => runTool(t, input, context),
    })]))
}

export interface McpToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: z.ZodType
  jsonSchema: Record<string, unknown>
  annotations: { readOnlyHint: boolean, destructiveHint: boolean, idempotentHint: boolean, openWorldHint: boolean }
  run: (input: unknown, context: ToolContext) => Promise<unknown>
}

/** Describes Wrote tools in MCP terms (JSON schema + annotations); the MCP server registers these. */
export function toMcpTools(tools: readonly WroteTool[]): McpToolDefinition[] {
  return tools.map(t => ({
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: t.input,
    jsonSchema: z.toJSONSchema(t.input, { io: 'input' }) as Record<string, unknown>,
    annotations: {
      readOnlyHint: t.permission === 'read',
      destructiveHint: t.permission === 'destructive',
      idempotentHint: t.permission === 'read',
      openWorldHint: false,
    },
    run: (input, context) => runTool(t, input, context),
  }))
}
