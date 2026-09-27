import { z } from 'zod'

export const TOOL_PERMISSIONS = ['read', 'propose', 'write', 'destructive'] as const
export type ToolPermissionLevel = (typeof TOOL_PERMISSIONS)[number]

/** What happens when a caller uses a tool of a level: run it, ask the author first, or refuse. */
export const PermissionDecisionSchema = z.enum(['allow', 'ask', 'deny'])
export type PermissionDecision = z.infer<typeof PermissionDecisionSchema>

/** A caller's policy per level. Destructive tools can never run without asking. */
export const ToolPolicySchema = z.object({
  read: z.enum(['allow', 'deny']).default('allow'),
  propose: z.enum(['allow', 'deny']).default('allow'),
  write: PermissionDecisionSchema.default('ask'),
  destructive: z.enum(['ask', 'deny']).default('ask'),
})
export type ToolPolicy = z.infer<typeof ToolPolicySchema>

export const DEFAULT_TOOL_POLICY: ToolPolicy = { read: 'allow', propose: 'allow', write: 'ask', destructive: 'ask' }

/** Policy patch: omitted levels stay unchanged (no defaults – Zod's `.partial()` would keep them). */
export const ToolPolicyPatchSchema = z.object({
  read: z.enum(['allow', 'deny']).optional(),
  propose: z.enum(['allow', 'deny']).optional(),
  write: PermissionDecisionSchema.optional(),
  destructive: z.enum(['ask', 'deny']).optional(),
})
export type ToolPolicyPatch = z.infer<typeof ToolPolicyPatchSchema>

/** An MCP client as shown in settings (the token itself is only shown once, when created). */
export interface McpClientView {
  id: string
  name: string
  /** First characters of the token, to recognise it. */
  tokenPreview: string
  createdAt: string
  lastUsedAt: string | null
  policy: ToolPolicy
}

export interface McpSettingsView {
  url: string
  clients: McpClientView[]
  /** Policy of the in-app assistant. */
  assistant: ToolPolicy
}

export const CreateMcpClientSchema = z.object({
  name: z.string().trim().min(1).max(80),
  policy: ToolPolicyPatchSchema.optional(),
})

export const UpdateMcpClientSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  policy: ToolPolicyPatchSchema.optional(),
})

export const UpdateAssistantPolicySchema = z.object({ policy: ToolPolicyPatchSchema })

/** A tool call waiting for the author's approval (pushed over SSE as `approval`). */
export interface PendingApproval {
  id: string
  bookId: string
  /** Who asks: assistant or MCP client name. */
  caller: { kind: string, name: string }
  tool: string
  toolTitle: string
  permission: ToolPermissionLevel
  /** The call's arguments, for the author to check. */
  input: unknown
  createdAt: string
  expiresAt: string
}

export interface ApprovalEvent {
  approval: PendingApproval
  state: 'pending' | 'approved' | 'denied' | 'expired'
}

export const DecideApprovalSchema = z.object({ approve: z.boolean() })
