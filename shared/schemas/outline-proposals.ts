import { z } from 'zod'
import { ActIdSchema, BeatIdSchema } from './outline'
import { ActorSchema } from './suggestion'

export const OutlineProposalStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export type OutlineProposalStatus = z.infer<typeof OutlineProposalStatusSchema>

const Title = z.string().trim().min(1).max(200)
const Summary = z.string().max(20_000)

/** What a proposal would change: a new beat (after `afterBeatId`, or first in the act), an edit of a beat, or a note. */
export const OutlineChangeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('addBeat'), actId: ActIdSchema, afterBeatId: BeatIdSchema.nullable().default(null), title: Title, summary: Summary.default('') }),
  z.object({ kind: z.literal('updateBeat'), beatId: BeatIdSchema, title: Title.optional(), summary: Summary.optional() }),
  z.object({ kind: z.literal('note'), text: z.string().trim().min(1).max(5_000) }),
])
export type OutlineChange = z.infer<typeof OutlineChangeSchema>

/**
 * A proposed outline change from the assistant, an MCP client or an outline helper. It is shown on the board
 * as a ghost card; nothing changes in `outline.md` until the author accepts it (a note is added to the
 * outline notes). `source` names what produced it (e.g. "Plot holes"), `rationale` why.
 */
export const OutlineProposalSchema = z.object({
  id: z.string().regex(/^opr_[a-z0-9]{10}$/),
  change: OutlineChangeSchema,
  rationale: z.string().max(2_000).default(''),
  source: z.string().max(200).default(''),
  author: ActorSchema,
  model: z.string().nullable().default(null),
  status: OutlineProposalStatusSchema.default('pending'),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().optional(),
})
export type OutlineProposal = z.infer<typeof OutlineProposalSchema>

export const NewOutlineProposalSchema = z.object({
  change: OutlineChangeSchema,
  rationale: z.string().trim().max(2_000).default(''),
})

export const OutlineProposalQuerySchema = z.object({ status: OutlineProposalStatusSchema.optional() })

/** Accept (optionally with the author's edits of title and summary) or reject a proposal. */
export const ResolveOutlineProposalSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('accepted'), edits: z.object({ title: Title.optional(), summary: Summary.optional() }).default({}) }),
  z.object({ status: z.literal('rejected') }),
])
export type ResolveOutlineProposalInput = z.infer<typeof ResolveOutlineProposalSchema>

/** "Suggest ways to get from beat A to beat B". */
export const BridgeBeatsSchema = z.object({ fromBeatId: BeatIdSchema, toBeatId: BeatIdSchema, count: z.number().int().min(2).max(4).optional() })

/** "Find plot holes" (whole outline) or "What's missing in act N" (`actId`), optionally against a beat sheet. */
export const ReviewOutlineSchema = z.object({ actId: ActIdSchema.optional(), templateId: z.string().regex(/^[\w.-]+$/).max(100).optional() })
