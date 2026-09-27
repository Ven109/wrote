import type { ToolContext } from '../tools/define'
import { requestApproval } from './approvals'

/** Approval requests for tool calls on a book, attributed to the caller (assistant or MCP client). */
export function approvalsFor(bookId: string | null, caller: ToolContext['caller']): ToolContext['requestApproval'] {
  if (!bookId) return undefined
  return (tool, input) => requestApproval({ bookId, caller, tool: tool.name, toolTitle: tool.title, permission: tool.permission, input })
}
