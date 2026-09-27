import { generateText, Output, type LanguageModel } from 'ai'
import type { CodexProposal } from '#shared/schemas/codex-proposals'
import type { StructureNode } from '#shared/schemas/manuscript'
import type { Actor } from '#shared/schemas/suggestion'
import { createRecordId } from '#shared/utils/ids'
import { extractionPrompt, type ExtractionPrompt } from '../ai/extraction-prompts'
import { ExtractionOutputSchema, normalizeExtraction, type ExistingCodexEntry, type ExtractionOutput } from '../codex/extraction'
import { listCodexTypes } from '../codex/types'
import { deletePendingCodexProposals, upsertCodexProposal } from '../db/state/codex-proposals'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { publishCodexProposalEvent } from '../utils/book-events'
import { listCodex } from './codex'
import { getStructure } from './structure'
import type { BookContext } from './workspace'

export const EXTRACT_CODEX_JOB = 'extract_codex'

/** Long chapters are cut here; scan scenes one by one for more. */
const MAX_TEXT_CHARS = 40_000

export type ExtractFn = (prompt: ExtractionPrompt, signal?: AbortSignal) => Promise<ExtractionOutput>

/** Structured-output extraction with a configured model. */
export function extractWith(model: LanguageModel): ExtractFn {
  return async (prompt, signal) => {
    const result = await generateText({ model, system: prompt.system, prompt: prompt.prompt, output: Output.object({ schema: ExtractionOutputSchema }), abortSignal: signal, maxRetries: 1 })
    return result.output
  }
}

const find = (nodes: StructureNode[], id: string): StructureNode | undefined =>
  nodes.reduce<StructureNode | undefined>((found, node) => found ?? (node.id === id ? node : find(node.children, id)), undefined)
const scenesOf = (node: StructureNode): StructureNode[] => node.type === 'scene' ? [node] : node.children.flatMap(scenesOf)

/** The text of a part, chapter or scene: its scenes in reading order. */
export async function manuscriptText(book: BookContext, entryId: string): Promise<{ title: string, text: string }> {
  const node = find(await getStructure(book.db), entryId)
  if (!node) throw new NotFoundError(`Manuscript entry ${entryId}`)
  const scenes = await Promise.all(scenesOf(node).map(async scene => `## ${scene.title}\n\n${(await book.repository.read(scene.path)).body.trim()}`))
  const text = scenes.join('\n\n')
  if (!text.trim()) throw new InvalidInputError(`“${node.title}” has no text to scan yet`)
  return { title: node.title, text: text.slice(0, MAX_TEXT_CHARS) }
}

async function existingCodex(book: BookContext): Promise<ExistingCodexEntry[]> {
  const [entries, rows] = await Promise.all([listCodex(book), book.db.$client.execute(`SELECT id, frontmatter FROM entries WHERE type = 'codex'`)])
  const frontmatter = new Map(rows.rows.map(row => [String(row.id), JSON.parse(String(row.frontmatter)) as Record<string, unknown>]))
  return entries.map(entry => ({ id: entry.id, path: entry.path, title: entry.title, codexType: entry.codexType, aliases: entry.aliases, frontmatter: frontmatter.get(entry.id) ?? {} }))
}

export interface ScanOptions {
  extract: ExtractFn
  model: string | null
  author: Actor
  signal?: AbortSignal
  now?: Date
}

/**
 * "Scan chapter": asks the model for codex entries in a manuscript text and stores them as pending proposals
 * (replacing earlier pending ones of the same text). Nothing is written to the codex until accepted.
 */
export async function scanForCodex(book: BookContext, entryId: string, options: ScanOptions): Promise<CodexProposal[]> {
  const [{ title, text }, existing, { types }] = await Promise.all([manuscriptText(book, entryId), existingCodex(book), listCodexTypes(book.root)])
  const output = await options.extract(extractionPrompt(title, text, existing, types), options.signal)
  const drafts = normalizeExtraction(output, text, existing, types)
  const createdAt = (options.now ?? new Date()).toISOString()
  await deletePendingCodexProposals(book.state, entryId)
  const proposals = await Promise.all(drafts.map(draft => upsertCodexProposal(book.state, {
    ...draft, id: createRecordId('cxp', 10), sourceEntryId: entryId, sourceTitle: title, author: options.author, model: options.model, status: 'pending', createdAt,
  })))
  publishCodexProposalEvent(book.id, { sourceEntryId: entryId })
  return proposals
}
