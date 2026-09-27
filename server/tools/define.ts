import type { z } from 'zod'
import type { Actor } from '#shared/schemas/suggestion'
import type { BookContext } from '../services/workspace'

/** How much a tool may change: drives the permission model (see WRO-59). */
export type ToolPermission = 'read' | 'propose' | 'write' | 'destructive'

export interface ToolContext {
  workspaceDir: string
  /** The book the caller works on. Tools that need no book (e.g. list_books) ignore it. */
  book: BookContext | null
  caller: Actor
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

/** Validates input, checks the book requirement and runs the tool. */
export async function runTool<I extends z.ZodType, O>(tool: WroteTool<I, O>, rawInput: unknown, context: ToolContext): Promise<O> {
  if (tool.requiresBook && !context.book) throw new ToolError(`${tool.name} needs an open book`, 'book_required')
  const parsed = tool.input.safeParse(rawInput)
  if (!parsed.success) throw new ToolError(`Invalid input for ${tool.name}: ${parsed.error.message}`, 'invalid_input')
  return tool.handler(parsed.data, context)
}
