import { z } from 'zod'
import { AiTaskSchema } from './ai'

export const REVIEW_SCOPES = ['scene', 'chapter', 'book'] as const
export const ReviewScopeSchema = z.enum(REVIEW_SCOPES)
export type ReviewScope = z.infer<typeof ReviewScopeSchema>

export const FINDING_SEVERITIES = ['low', 'medium', 'high'] as const
export const FindingSeveritySchema = z.enum(FINDING_SEVERITIES)
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>

export const AgentIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/)

/**
 * A review agent: instructions for one kind of editorial pass (continuity, line editing, …), the scopes it
 * can run on and which configured model slot it uses. Built-in agents ship with Wrote; custom ones live in
 * the book's `agents/` folder.
 */
export const ReviewAgentSchema = z.object({
  id: AgentIdSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).default(''),
  instructions: z.string().trim().min(1).max(20_000),
  scopes: z.array(ReviewScopeSchema).min(1).default(['scene', 'chapter']),
  task: AiTaskSchema.default('chat'),
  /**
   * Extra material the agent gets besides the book context: `outline` (the beats the scene tells, for
   * structure), `research` (research notes matching the scene, for fact checks), `heuristics` (cheap
   * line-level flags – repetition, filter words, adverbs, passive voice – for the model to confirm), `timeline`
   * (scenes and events around this one in in-world order, with who and where).
   */
  tools: z.array(z.enum(['outline', 'research', 'heuristics', 'timeline'])).default([]),
  /** Also asks for a short per-scene summary (e.g. a beta reader's engagement), kept on the run. */
  summary: z.boolean().default(false),
  /** Categories the agent reports (shown as filters; findings may use others). */
  categories: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  source: z.enum(['builtin', 'book']).default('builtin'),
})
export type ReviewAgent = z.infer<typeof ReviewAgentSchema>

/** What the model returns for one scene (structured output). */
export const FindingsOutputSchema = z.object({
  findings: z.array(z.object({
    quote: z.string().describe('The passage the finding is about, copied exactly from the scene (a sentence or phrase)'),
    severity: FindingSeveritySchema.describe('low: polish, medium: worth fixing, high: a real problem'),
    category: z.string().describe('Short category, e.g. repetition, continuity, pacing'),
    message: z.string().describe('What is wrong and why, in one to three sentences'),
    suggestion: z.string().nullable().describe('Replacement text for the quoted passage, or null when there is no direct fix'),
  })),
  summary: z.string().nullable().default(null).describe('Only when the instructions ask for a scene summary; otherwise null'),
})
export type FindingsOutput = z.infer<typeof FindingsOutputSchema>

/** Review metadata on a comment that is a finding. `fingerprint` recognises it again on later runs. */
export const FindingInfoSchema = z.object({
  runId: z.string(),
  agentId: AgentIdSchema,
  severity: FindingSeveritySchema,
  category: z.string().max(50),
  suggestion: z.string().max(10_000).nullable().default(null),
  fingerprint: z.string(),
  /** The suggestion "Apply fix" created; accepting it resolves the finding. */
  suggestionId: z.string().nullable().default(null),
  /** Dismissed (not just resolved): the same finding is not raised again by this agent. */
  dismissed: z.boolean().default(false),
})
export type FindingInfo = z.infer<typeof FindingInfoSchema>

export const ReviewRunStatusSchema = z.enum(['queued', 'running', 'done', 'failed', 'cancelled'])

/** One run of an agent over a scene, chapter or the whole book. */
export const ReviewRunSchema = z.object({
  id: z.string().regex(/^rvr_[a-z0-9]{10}$/),
  agentId: AgentIdSchema,
  agentName: z.string(),
  scope: ReviewScopeSchema,
  targetId: z.string().nullable(),
  targetTitle: z.string(),
  /** The scenes reviewed, in reading order. */
  sceneIds: z.array(z.string()),
  status: ReviewRunStatusSchema,
  jobId: z.string().nullable().default(null),
  model: z.string().nullable().default(null),
  findings: z.number().int().default(0),
  /** Per-scene summaries for agents that write one (beta reader engagement). */
  summaries: z.array(z.object({ sceneId: z.string(), title: z.string(), text: z.string() })).default([]),
  error: z.string().nullable().default(null),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable().default(null),
})
export type ReviewRun = z.infer<typeof ReviewRunSchema>

/** Rough size of a run, shown before it starts (and confirmed for the whole book). */
export interface ReviewEstimate {
  scenes: number
  /** Model calls (one per scene). */
  calls: number
  inputTokens: number
  outputTokens: number
  /** USD, when the model's price is known. */
  cost: number | null
}

export const StartReviewSchema = z.object({
  agentId: AgentIdSchema,
  scope: ReviewScopeSchema,
  /** Scene or chapter id (not for the whole book). */
  targetId: z.string().regex(/^[a-z]{3}_[a-z0-9]+$/).optional(),
  /** Book-wide runs need the estimate confirmed. */
  confirmed: z.boolean().default(false),
})
export type StartReviewInput = z.infer<typeof StartReviewSchema>

export const ReviewRunQuerySchema = z.object({ sceneId: z.string().optional() })

/** A custom agent as the editor sends it (saved to `agents/<id>.md`). */
export const SaveAgentSchema = ReviewAgentSchema.omit({ source: true })
export type SaveAgentInput = z.infer<typeof SaveAgentSchema>

/** "Test on scene": an agent (possibly unsaved) and the scene to try it on. */
export const TestAgentSchema = z.object({ agent: SaveAgentSchema, sceneId: z.string().regex(/^scn_[a-z0-9]+$/) })

/** A finding from a test run (not stored). */
export interface PreviewFinding {
  quote: string
  severity: FindingSeverity
  category: string
  message: string
  suggestion: string | null
}
