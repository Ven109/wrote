import { z } from 'zod'
import { CodexFieldValueSchema, CodexTypeIdSchema } from './codex'
import { ActorSchema } from './suggestion'

export const CodexProposalStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export type CodexProposalStatus = z.infer<typeof CodexProposalStatusSchema>

/**
 * A proposed codex change found in the manuscript ("Scan chapter"): a new entry, or new facts for an existing
 * one. Like text suggestions, nothing changes until the author accepts it. `evidence` holds verbatim quotes
 * from the scanned text that support it.
 */
export const CodexProposalSchema = z.object({
  id: z.string(),
  action: z.enum(['create', 'update']),
  codexType: CodexTypeIdSchema,
  title: z.string().min(1).max(200),
  /** The existing entry an update applies to. */
  targetEntryId: z.string().nullable().default(null),
  targetPath: z.string().nullable().default(null),
  /** New aliases only (for updates: not yet on the entry). */
  aliases: z.array(z.string()).default([]),
  /** Template fields to set (for updates: only values that differ from the entry). */
  fields: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
  /** Body for a new entry: a short description. */
  description: z.string().default(''),
  evidence: z.array(z.string()).default([]),
  /** The scanned manuscript entry (chapter, scene or part). */
  sourceEntryId: z.string(),
  sourceTitle: z.string(),
  author: ActorSchema,
  model: z.string().nullable().default(null),
  status: CodexProposalStatusSchema.default('pending'),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().optional(),
})
export type CodexProposal = z.infer<typeof CodexProposalSchema>

export const ExtractCodexSchema = z.object({
  /** Chapter (or scene/part) to scan. */
  entryId: z.string().regex(/^[a-z]{3}_[a-z0-9]+$/),
})

export const CodexProposalQuerySchema = z.object({
  status: CodexProposalStatusSchema.optional(),
  sourceEntryId: z.string().optional(),
})

/** Accept (optionally with the author's edits) or reject a proposal. */
export const ResolveCodexProposalSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('accepted'),
    edits: z.object({
      title: z.string().trim().min(1).max(200).optional(),
      codexType: CodexTypeIdSchema.optional(),
      aliases: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
      fields: z.record(z.string(), CodexFieldValueSchema).optional(),
      description: z.string().max(20_000).optional(),
    }).default({}),
  }),
  z.object({ status: z.literal('rejected') }),
])
export type ResolveCodexProposalInput = z.infer<typeof ResolveCodexProposalSchema>
