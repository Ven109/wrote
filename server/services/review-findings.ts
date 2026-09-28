import type { Comment } from '#shared/schemas/comments'
import type { FindingsOutput, ReviewAgent } from '#shared/schemas/review'
import type { Suggestion } from '#shared/schemas/suggestion'
import { createRecordId } from '#shared/utils/ids'
import { anchorContext, locateAnchorFuzzy } from '#shared/utils/text-anchor'
import { findComments, upsertComment } from '../db/state/comments'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { hashContent } from '../storage/fs'
import { publishCommentEvent } from '../utils/book-events'
import { getEntry } from './entries'
import { createSuggestion } from './suggestions'
import type { BookContext } from './workspace'

const squash = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim()

/** Recognises "the same finding" across runs: agent, category and passage. */
export const fingerprintOf = (agentId: string, category: string, quote: string) => hashContent(`${agentId}|${squash(category)}|${squash(quote)}`)

/** Where the model's quote is in the scene: exact, or without wrapping quote marks / trailing whitespace. */
function findQuote(body: string, quote: string): { quote: string, from: number } | null {
  for (const candidate of [quote, quote.trim(), quote.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')]) {
    const from = candidate.length >= 3 ? body.indexOf(candidate) : -1
    if (from >= 0) return { quote: candidate, from }
  }
  return null
}

/**
 * Stores a scene's findings as comments anchored to their passage. Findings whose quote is not in the text
 * are dropped (models invent quotes); ones the author dismissed before, or that are still open from an
 * earlier run, are not raised again.
 */
export async function storeFindings(book: BookContext, input: { runId: string, agent: ReviewAgent, entryId: string, body: string, output: FindingsOutput }, now = new Date()): Promise<Comment[]> {
  const previous = (await findComments(book.state, { entryId: input.entryId, includeResolved: true })).filter(comment => comment.review?.agentId === input.agent.id)
  const known = new Set(previous.filter(comment => comment.review!.dismissed || !comment.resolvedAt).map(comment => comment.review!.fingerprint))
  const stored: Comment[] = []
  for (const finding of input.output.findings) {
    const found = findQuote(input.body, finding.quote)
    const message = finding.message.trim()
    if (!found || !message) continue
    const category = finding.category.trim().slice(0, 50) || 'general'
    const fingerprint = fingerprintOf(input.agent.id, category, found.quote)
    if (known.has(fingerprint)) continue
    known.add(fingerprint)
    const suggestion = finding.suggestion?.trim() && finding.suggestion.trim() !== found.quote.trim() ? finding.suggestion.trim().slice(0, 10_000) : null
    stored.push(await upsertComment(book.state, {
      id: createRecordId('cmt', 10),
      entryId: input.entryId,
      quote: found.quote,
      ...anchorContext(input.body, { from: found.from, to: found.from + found.quote.length }),
      body: message.slice(0, 10_000),
      author: { kind: 'agent', name: input.agent.name },
      replies: [],
      createdAt: now.toISOString(),
      resolvedAt: null,
      review: { runId: input.runId, agentId: input.agent.id, severity: finding.severity, category, suggestion, fingerprint, suggestionId: null, dismissed: false },
    }))
  }
  if (stored.length) publishCommentEvent(book.id, { entryId: input.entryId })
  return stored
}

async function finding(book: BookContext, id: string): Promise<Comment & { review: NonNullable<Comment['review']> }> {
  const [comment] = await findComments(book.state, { id })
  if (!comment?.review) throw new NotFoundError(`Finding ${id}`)
  return comment as Comment & { review: NonNullable<Comment['review']> }
}

async function save(book: BookContext, comment: Comment): Promise<Comment> {
  const saved = await upsertComment(book.state, comment)
  publishCommentEvent(book.id, { entryId: saved.entryId })
  return saved
}

/** Dismisses a finding: it is hidden and the agent does not raise it again. */
export async function dismissFinding(book: BookContext, id: string, now = new Date()): Promise<Comment> {
  const comment = await finding(book, id)
  return save(book, { ...comment, resolvedAt: comment.resolvedAt ?? now.toISOString(), review: { ...comment.review, dismissed: true } })
}

/**
 * "Apply fix": turns the finding's suggested replacement into a normal suggestion on the passage as it reads
 * now (the author may have edited it). Accepting that suggestion resolves the finding.
 */
export async function suggestFindingFix(book: BookContext, id: string, now = new Date()): Promise<Suggestion> {
  const comment = await finding(book, id)
  if (!comment.review.suggestion) throw new InvalidInputError('This finding has no suggested fix')
  const entry = await getEntry(book.db, book.repository, { id: comment.entryId }).catch(() => null)
  const range = entry ? locateAnchorFuzzy(entry.body, comment.quote, comment) : null
  if (!entry || !range) throw new InvalidInputError('The passage of this finding is no longer in the text')
  const suggestion = await createSuggestion(book, {
    entryId: comment.entryId,
    find: entry.body.slice(range.from, range.to),
    replace: comment.review.suggestion,
    rationale: comment.body,
    author: comment.author,
  }, now)
  await save(book, { ...comment, review: { ...comment.review, suggestionId: suggestion.id } })
  return suggestion
}

/** Resolves the findings whose fix was just accepted. */
export async function resolveFindingsFixedBy(book: BookContext, accepted: Suggestion[], now = new Date()): Promise<void> {
  for (const suggestion of accepted) {
    const comments = await findComments(book.state, { entryId: suggestion.entryId })
    for (const comment of comments.filter(candidate => candidate.review?.suggestionId === suggestion.id)) await save(book, { ...comment, resolvedAt: now.toISOString() })
  }
}
