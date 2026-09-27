import type { z } from 'zod'
import { DEFAULT_TOOL_POLICY, type PermissionDecision, type ToolPermissionLevel, type ToolPolicy } from '#shared/schemas/permissions'
import type { Actor } from '#shared/schemas/suggestion'
import type { BookContext } from '../services/workspace'

/** How much a tool may change: drives the permission model (`read` < `propose` < `write` < `destructive`). */
export type ToolPermission = ToolPermissionLevel

export interface ToolContext {
  workspaceDir: string
  /** The book the caller works on. Tools that need no book (e.g. list_books) ignore it. */
  book: BookContext | null
  caller: Actor
  /** The caller's policy (default: read/propose allowed, write/destructive ask). */
  policy?: ToolPolicy
  /** Asks the author to approve a call (`ask` levels). Without it, such calls are refused. */
  requestApproval?: (tool: WroteTool, input: unknown) => Promise<boolean>
}

export interface WroteTool<I extends z.ZodType = z.ZodType, O = unknown> {
  name: string
  title: string
  /** Written for LLMs: what it does, when to use it, what it returns. */
  description: string
  permission: ToolPermission
  input: I
  requiresBook: boolean
  handler: (input: z.infer<I>, context: ToolContext) => Promise<O>
}

/** Defines a book tool once; adapters expose it to the AI SDK assistant and MCP clients. */
export function defineWroteTool<I extends z.ZodType, O>(tool: Omit<WroteTool<I, O>, 'requiresBook'> & { requiresBook?: boolean }): WroteTool<I, O> {
  return { requiresBook: true, ...tool }
}

export class ToolError extends Error {
  constructor(message: string, readonly code = 'tool_error') {
    super(message)
    this.name = 'ToolError'
  }
}

/** What a policy says about a tool's level. */
export function decisionFor(policy: ToolPolicy | undefined, permission: ToolPermission): PermissionDecision {
  return (policy ?? DEFAULT_TOOL_POLICY)[permission]
}

/** Enforces the caller's policy: allowed calls pass, `ask` waits for the author, denied calls never run. */
async function authorize(tool: WroteTool, input: unknown, context: ToolContext): Promise<void> {
  const decision = decisionFor(context.policy, tool.permission)
  if (decision === 'allow') return
  if (decision === 'deny') {
    throw new ToolError(`${tool.name} is not allowed: "${context.caller.name}" may not use ${tool.permission} tools. The author can change this in Wrote's settings (Connect agents).`, 'permission_denied')
  }
  if (!context.requestApproval) {
    throw new ToolError(`${tool.name} needs the author's approval, which can only be given in the running Wrote app (connect over HTTP at /mcp). Try propose_edit or a note instead.`, 'approval_unavailable')
  }
  if (!await context.requestApproval(tool, input)) {
    throw new ToolError(`The author did not approve ${tool.name}. Do not retry the same call; ask the author or propose the change instead.`, 'permission_denied')
  }
}

/** Validates input, checks the book requirement and the caller's permissions, then runs the tool. */
export async function runTool<I extends z.ZodType, O>(tool: WroteTool<I, O>, rawInput: unknown, context: ToolContext): Promise<O> {
  if (tool.requiresBook && !context.book) throw new ToolError(`${tool.name} needs an open book`, 'book_required')
  const parsed = tool.input.safeParse(rawInput)
  if (!parsed.success) throw new ToolError(`Invalid input for ${tool.name}: ${parsed.error.message}`, 'invalid_input')
  await authorize(tool as unknown as WroteTool, parsed.data, context)
  return tool.handler(parsed.data, context)
}
