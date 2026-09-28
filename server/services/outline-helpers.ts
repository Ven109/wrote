import { generateText, Output, type LanguageModel } from 'ai'
import type { z } from 'zod'
import type { Beat, Outline } from '#shared/schemas/outline'
import type { OutlineChange, OutlineProposal } from '#shared/schemas/outline-proposals'
import type { Actor } from '#shared/schemas/suggestion'
import { buildContext } from '../ai/context/build'
import { renderContext } from '../ai/context/render'
import { bridgePrompt, BridgeOutputSchema, reviewPrompt, ReviewOutputSchema, type HelperPrompt } from '../ai/outline-prompts'
import { saveContextSnapshot } from '../db/state/context-snapshots'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { listBeatSheets } from './beat-sheets'
import { readOutline } from './outline'
import { createOutlineProposals, type ProposalMeta } from './outline-proposals'
import type { BookContext } from './workspace'

/** Author of proposals the helpers make when run from the outline page. */
export const OUTLINE_HELPER: Actor = { kind: 'assistant', name: 'Outline helper' }

export type GenerateObject = <S extends z.ZodType>(prompt: HelperPrompt, schema: S) => Promise<z.infer<S>>

/** Structured output with a configured model. */
export function generateWith(model: LanguageModel): GenerateObject {
  return async (prompt, schema) => schema.parse((await generateText({ model, system: prompt.system, prompt: prompt.prompt, output: Output.object({ schema }), maxRetries: 1 })).output)
}

export interface HelperOptions extends Omit<ProposalMeta, 'source'> {
  generate: GenerateObject
}

type NewProposal = Pick<OutlineProposal, 'change' | 'rationale'>
const clip = (text: string, max: number) => text.trim().slice(0, max)
const allBeats = (outline: Outline) => outline.acts.flatMap(act => act.beats.map(beat => ({ act, beat })))

function beatOf(outline: Outline, id: string): { actId: string, beat: Beat } {
  const found = allBeats(outline).find(({ beat }) => beat.id === id)
  if (!found) throw new NotFoundError(`Beat ${id}`)
  return { actId: found.act.id, beat: found.beat }
}

/**
 * Adds the book context (summaries, passages relevant to `query`, pinned items) from the context engine to a
 * helper prompt and stores the snapshot, so what was sent to the model can be inspected like other AI requests.
 */
async function withBookContext(book: BookContext, feature: string, prompt: HelperPrompt, query: string, model: string | null | undefined): Promise<HelperPrompt> {
  const ref = model ?? 'unknown'
  const built = await buildContext(book, { query, model: ref })
  const system = [prompt.system, renderContext(built.items)].filter(Boolean).join('\n\n')
  await saveContextSnapshot(book.state, { feature, model: ref, ...built, system }, new Date())
  return { system, prompt: prompt.prompt }
}

/**
 * "Suggest ways to get from beat A to beat B": 2–4 alternative beats, proposed right after A (the author keeps
 * the one they like and rejects the rest).
 */
export async function suggestBridgeBeats(book: BookContext, input: { fromBeatId: string, toBeatId: string, count?: number }, options: HelperOptions): Promise<OutlineProposal[]> {
  if (input.fromBeatId === input.toBeatId) throw new InvalidInputError('Pick two different beats')
  const { outline } = await readOutline(book)
  const from = beatOf(outline, input.fromBeatId)
  const to = beatOf(outline, input.toBeatId)
  const count = Math.min(4, Math.max(2, input.count ?? 3))
  const prompt = await withBookContext(book, 'outline:bridge', bridgePrompt(outline, from.beat, to.beat, count), `${from.beat.title} ${from.beat.summary} ${to.beat.title} ${to.beat.summary}`, options.model)
  const output = await options.generate(prompt, BridgeOutputSchema)
  const items: NewProposal[] = output.beats.filter(beat => beat.title.trim()).slice(0, 4).map(beat => ({
    change: { kind: 'addBeat', actId: from.actId, afterBeatId: from.beat.id, title: clip(beat.title, 200), summary: clip(beat.summary, 2_000) },
    rationale: clip(beat.rationale, 2_000),
  }))
  return createOutlineProposals(book, items, { ...options, source: `Bridge: ${from.beat.title} → ${to.beat.title}` })
}

/** A model's beat, anchored to the outline: `null` is the start of the act, an unknown anchor its end; unknown acts are dropped. */
function anchoredBeat(outline: Outline, beat: { actId: string, afterBeatId: string | null, title: string, summary: string }): OutlineChange | null {
  const act = outline.acts.find(candidate => candidate.id === beat.actId)
  if (!act || !beat.title.trim()) return null
  const known = !beat.afterBeatId || act.beats.some(candidate => candidate.id === beat.afterBeatId)
  const afterBeatId = known ? beat.afterBeatId : act.beats.at(-1)?.id ?? null
  return { kind: 'addBeat', actId: act.id, afterBeatId, title: clip(beat.title, 200), summary: clip(beat.summary, 2_000) }
}

export interface ReviewInput {
  /** Only this act ("what's missing in act 2"); the whole outline (plot holes) when absent. */
  actId?: string
  /** Beat sheet to compare with (a file in the workspace's templates folder). */
  templateId?: string
}

/** "Find plot holes" / "What's missing in act N": notes and suggested beats, all as proposals. */
export async function reviewOutline(book: BookContext, input: ReviewInput, options: HelperOptions): Promise<OutlineProposal[]> {
  const { outline } = await readOutline(book)
  if (!outline.acts.length) throw new InvalidInputError('The outline has no acts yet')
  const act = input.actId ? outline.acts.find(candidate => candidate.id === input.actId) : undefined
  if (input.actId && !act) throw new NotFoundError(`Act ${input.actId}`)
  const template = input.templateId ? (await listBeatSheets(book.workspaceDir)).sheets.find(sheet => sheet.id === input.templateId) : undefined
  if (input.templateId && !template) throw new NotFoundError(`Beat sheet ${input.templateId}`)
  const focus = { actId: act?.id, actTitle: act?.title, template: template ? { ...template.outline, title: template.title } : undefined }
  const query = (act ?? { beats: outline.acts.flatMap(candidate => candidate.beats) }).beats.map(beat => beat.title).join(' ')
  const prompt = await withBookContext(book, act ? 'outline:act-gaps' : 'outline:plot-holes', reviewPrompt(outline, focus), query, options.model)
  const output = await options.generate(prompt, ReviewOutputSchema)
  const notes: NewProposal[] = output.notes.filter(note => note.text.trim()).slice(0, 5).map(note => ({ change: { kind: 'note', text: clip(note.text, 5_000) }, rationale: '' }))
  const beats: NewProposal[] = output.beats
    .filter(beat => !act || beat.actId === act.id)
    .map(beat => ({ change: anchoredBeat(outline, beat), rationale: clip(beat.rationale, 2_000) }))
    .filter((item): item is NewProposal => item.change !== null)
    .slice(0, 4)
  const source = act ? `Missing in ${act.title}` : 'Plot holes'
  return createOutlineProposals(book, [...notes, ...beats], { ...options, source: template ? `${source} (vs. ${template.title})` : source })
}
