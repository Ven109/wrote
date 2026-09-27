import type { CodexProposal, CodexProposalStatus, ResolveCodexProposalInput } from '#shared/schemas/codex-proposals'
import { validateFields, type FieldValue } from '../codex/types'
import { findCodexProposals, upsertCodexProposal } from '../db/state/codex-proposals'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { publishCodexProposalEvent } from '../utils/book-events'
import { codexType, createCodexEntry, updateCodexEntry } from './codex'
import { pathForId } from './entries'
import type { BookContext } from './workspace'

type AcceptEdits = Extract<ResolveCodexProposalInput, { status: 'accepted' }>['edits']

export const listCodexProposals = (book: BookContext, filter: { status?: CodexProposalStatus, sourceEntryId?: string } = {}) =>
  findCodexProposals(book.state, filter)

const nonEmpty = (fields: Record<string, FieldValue>) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== '' && !(Array.isArray(value) && !value.length)))

/** Creates the proposed entry (fields, aliases and description), after validating everything first. */
async function applyCreate(book: BookContext, proposal: CodexProposal, edits: AcceptEdits): Promise<{ id: string, path: string }> {
  const type = await codexType(book, edits.codexType ?? proposal.codexType)
  const fields = nonEmpty(edits.fields ?? proposal.fields)
  const problems = validateFields(type, fields)
  if (problems.length) throw new InvalidInputError(problems.join('; '))
  const created = await createCodexEntry(book, { type: type.id, title: edits.title ?? proposal.title })
  const aliases = edits.aliases ?? proposal.aliases
  await updateCodexEntry(book, { path: created.path, fields, ...(aliases.length ? { aliases } : {}) })
  const description = (edits.description ?? proposal.description).trim()
  if (description) {
    const entry = await book.repository.read(created.path)
    await book.repository.write(created.path, { frontmatter: entry.frontmatter, body: `${description}\n` }, entry.hash)
  }
  return created
}

/** Adds the proposed aliases and fields to the existing entry (wherever it lives now). */
async function applyUpdate(book: BookContext, proposal: CodexProposal, edits: AcceptEdits): Promise<{ id: string, path: string }> {
  const id = proposal.targetEntryId!
  const path = await pathForId(book.db, id).catch(() => null)
  if (!path) throw new NotFoundError(`Codex entry ${proposal.title}`)
  const entry = await book.repository.read(path)
  const current = Array.isArray(entry.frontmatter.aliases) ? entry.frontmatter.aliases as string[] : []
  const added = (edits.aliases ?? proposal.aliases).filter(alias => !current.includes(alias))
  await updateCodexEntry(book, { path, fields: edits.fields ?? proposal.fields, ...(added.length ? { aliases: [...current, ...added] } : {}) })
  return { id, path }
}

/**
 * The author's decision on a proposal: accepting writes it to the codex (with the author's edits, if any);
 * rejecting only records the decision.
 */
export async function resolveCodexProposal(book: BookContext, id: string, input: ResolveCodexProposalInput, now = new Date()): Promise<{ proposal: CodexProposal, entry: { id: string, path: string } | null }> {
  const [proposal] = await findCodexProposals(book.state, { id })
  if (!proposal) throw new NotFoundError(`Codex proposal ${id}`)
  if (proposal.status !== 'pending') throw new InvalidInputError('This proposal was already resolved')
  const entry = input.status === 'accepted'
    ? await (proposal.action === 'create' ? applyCreate : applyUpdate)(book, proposal, input.edits)
    : null
  const resolved = await upsertCodexProposal(book.state, { ...proposal, status: input.status, resolvedAt: now.toISOString() })
  publishCodexProposalEvent(book.id, { sourceEntryId: proposal.sourceEntryId })
  return { proposal: resolved, entry }
}
