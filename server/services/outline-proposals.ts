import type { OutlineDocument } from '#shared/schemas/outline'
import type { OutlineProposal, OutlineProposalStatus, ResolveOutlineProposalInput } from '#shared/schemas/outline-proposals'
import type { Actor } from '#shared/schemas/suggestion'
import { createRecordId } from '#shared/utils/ids'
import { OutlineOpError } from '#shared/utils/outline-ops'
import { changeProblem, proposalOps } from '#shared/utils/outline-proposals'
import { findOutlineProposals, upsertOutlineProposal } from '../db/state/outline-proposals'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { publishOutlineProposalEvent } from '../utils/book-events'
import { readOutline, updateOutline } from './outline'
import type { BookContext } from './workspace'

export const listOutlineProposals = (book: BookContext, filter: { status?: OutlineProposalStatus } = {}) =>
  findOutlineProposals(book.state, filter)

export interface ProposalMeta {
  author: Actor
  model?: string | null
  /** What produced the proposals, e.g. "Plot holes" – shown with them. */
  source?: string
}

/**
 * Stores proposed outline changes for the author to review. All of them must refer to acts and beats of the
 * current outline; otherwise none is stored and the problems are reported (so an agent can correct them).
 */
export async function createOutlineProposals(book: BookContext, items: Pick<OutlineProposal, 'change' | 'rationale'>[], meta: ProposalMeta, now = new Date()): Promise<OutlineProposal[]> {
  const { outline } = await readOutline(book)
  const problems = items.map(item => changeProblem(outline, item.change)).filter(Boolean)
  if (problems.length) throw new InvalidInputError(`${problems.join('; ')}. Get current ids with get_outline.`)
  const created: OutlineProposal[] = []
  for (const item of items) {
    created.push(await upsertOutlineProposal(book.state, {
      id: createRecordId('opr', 10),
      change: item.change,
      rationale: item.rationale,
      source: meta.source ?? '',
      author: meta.author,
      model: meta.model ?? null,
      status: 'pending',
      createdAt: now.toISOString(),
    }))
  }
  if (created.length) publishOutlineProposalEvent(book.id, { id: created[0]!.id })
  return created
}

/** The author's decision: accepting applies the change to `outline.md` (with their edits); rejecting only records it. */
export async function resolveOutlineProposal(book: BookContext, id: string, input: ResolveOutlineProposalInput, now = new Date()): Promise<{ proposal: OutlineProposal, outline: OutlineDocument | null }> {
  const [proposal] = await findOutlineProposals(book.state, { id })
  if (!proposal) throw new NotFoundError(`Outline proposal ${id}`)
  if (proposal.status !== 'pending') throw new InvalidInputError('This proposal was already resolved')
  let outline: OutlineDocument | null = null
  if (input.status === 'accepted') {
    const current = await readOutline(book)
    try {
      outline = await updateOutline(book, proposalOps(current.outline, proposal.change, input.edits), current.hash)
    }
    catch (error) {
      if (error instanceof OutlineOpError) throw new InvalidInputError(error.message)
      throw error
    }
  }
  const resolved = await upsertOutlineProposal(book.state, { ...proposal, status: input.status, resolvedAt: now.toISOString() })
  publishOutlineProposalEvent(book.id, { id })
  return { proposal: resolved, outline }
}
