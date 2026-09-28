import { generateText, Output, type LanguageModel } from 'ai'
import type { StructureNode } from '#shared/schemas/manuscript'
import { FindingsOutputSchema, type FindingsOutput, type ReviewAgent, type ReviewEstimate, type ReviewRun, type StartReviewInput } from '#shared/schemas/review'
import { createRecordId } from '#shared/utils/ids'
import { buildContext } from '../ai/context/build'
import { renderContext } from '../ai/context/render'
import { contextBudget, estimateTokens } from '../ai/context/tokens'
import { reviewPrompt, reviewSystem, type ReviewPrompt } from '../ai/review-prompts'
import { saveContextSnapshot } from '../db/state/context-snapshots'
import { getReviewRun, upsertReviewRun } from '../db/state/review-runs'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { publishCommentEvent } from '../utils/book-events'
import { reviewAgent } from './review-agents'
import { storeFindings } from './review-findings'
import { getStructure } from './structure'
import type { BookContext } from './workspace'

export const REVIEW_JOB = 'review'
/** Expected output per scene (findings are short). */
const OUTPUT_TOKENS_PER_SCENE = 700

export type ReviewFn = (prompt: ReviewPrompt, signal?: AbortSignal) => Promise<FindingsOutput>

/** Structured findings from a configured model. */
export function reviewWith(model: LanguageModel): ReviewFn {
  return async (prompt, signal) => FindingsOutputSchema.parse((await generateText({ model, system: prompt.system, prompt: prompt.prompt, output: Output.object({ schema: FindingsOutputSchema }), abortSignal: signal, maxRetries: 1 })).output)
}

const find = (nodes: StructureNode[], id: string): StructureNode | undefined =>
  nodes.reduce<StructureNode | undefined>((found, node) => found ?? (node.id === id ? node : find(node.children, id)), undefined)
const scenesOf = (nodes: StructureNode[]): StructureNode[] => nodes.flatMap(node => node.type === 'scene' ? [node] : scenesOf(node.children))

export interface ReviewPlan {
  agent: ReviewAgent
  targetId: string | null
  targetTitle: string
  scenes: StructureNode[]
}

/** What a run would review: the agent, and the scenes of the scene, chapter or whole book. */
export async function planReview(book: BookContext, input: Pick<StartReviewInput, 'agentId' | 'scope' | 'targetId'>): Promise<ReviewPlan> {
  const agent = await reviewAgent(book, input.agentId)
  if (!agent.scopes.includes(input.scope)) throw new InvalidInputError(`${agent.name} does not review a whole ${input.scope}`)
  const structure = await getStructure(book.db)
  if (input.scope === 'book') return { agent, targetId: null, targetTitle: 'Whole book', scenes: scenesOf(structure) }
  const node = input.targetId ? find(structure, input.targetId) : undefined
  if (!node) throw new NotFoundError(`Manuscript entry ${input.targetId ?? '(none)'}`)
  if (input.scope === 'scene' ? node.type !== 'scene' : node.type !== 'chapter') throw new InvalidInputError(`“${node.title}” is not a ${input.scope}`)
  return { agent, targetId: node.id, targetTitle: node.title, scenes: scenesOf([node]) }
}

/** Tokens and model calls for a plan: scene text + instructions + book context in, findings out. */
export async function estimateReview(book: BookContext, plan: ReviewPlan, modelRef: string): Promise<ReviewEstimate> {
  let inputTokens = 0
  const perCall = estimateTokens(plan.agent.instructions) + Math.min(contextBudget(modelRef), 6_000) + 300
  for (const scene of plan.scenes) {
    const body = (await book.repository.read(scene.path).catch(() => null))?.body ?? ''
    if (body.trim()) inputTokens += estimateTokens(body) + perCall
  }
  const calls = plan.scenes.length
  return { scenes: calls, calls, inputTokens, outputTokens: calls * OUTPUT_TOKENS_PER_SCENE, cost: null }
}

/** Creates a queued run; the `review` job does the work. */
export async function createReviewRun(book: BookContext, plan: ReviewPlan, scope: ReviewRun['scope'], now = new Date()): Promise<ReviewRun> {
  if (!plan.scenes.length) throw new InvalidInputError('There are no scenes to review')
  return upsertReviewRun(book.state, {
    id: createRecordId('rvr', 10),
    agentId: plan.agent.id,
    agentName: plan.agent.name,
    scope,
    targetId: plan.targetId,
    targetTitle: plan.targetTitle,
    sceneIds: plan.scenes.map(scene => scene.id),
    status: 'queued',
    jobId: null,
    model: null,
    findings: 0,
    error: null,
    createdAt: now.toISOString(),
    finishedAt: null,
  })
}

export interface RunOptions {
  review: ReviewFn
  model: string
  signal?: AbortSignal
  progress?: (value: number, message?: string) => Promise<void>
  now?: () => Date
}

/** One scene's prompt: the agent's instructions plus book context from the context engine (snapshot stored). */
async function scenePrompt(book: BookContext, agent: ReviewAgent, scene: StructureNode, body: string, model: string): Promise<ReviewPrompt> {
  const built = await buildContext(book, { entryPath: scene.path, query: agent.instructions.slice(0, 500), model })
  // The scene itself is in the prompt in full; the local layer would repeat it.
  const items = built.items.filter(item => item.layer !== 'local')
  const system = reviewSystem(agent, renderContext(items))
  await saveContextSnapshot(book.state, { feature: `review:${agent.id}`, model, ...built, items, system }, new Date())
  return { system, prompt: reviewPrompt(scene.title, body) }
}

/**
 * Runs a review scene by scene: progress after each scene, findings stored as they come (a cancelled run
 * keeps what it found so far). Scenes that were deleted or are empty are skipped.
 */
export async function executeReviewRun(book: BookContext, runId: string, options: RunOptions): Promise<ReviewRun> {
  const now = options.now ?? (() => new Date())
  let run = await getReviewRun(book.state, runId)
  if (!run) throw new NotFoundError(`Review run ${runId}`)
  const agent = await reviewAgent(book, run.agentId)
  const scenes = scenesOf(await getStructure(book.db))
  run = await upsertReviewRun(book.state, { ...run, status: 'running', model: options.model })
  try {
    for (const [index, sceneId] of run.sceneIds.entries()) {
      options.signal?.throwIfAborted()
      const scene = scenes.find(candidate => candidate.id === sceneId)
      await options.progress?.(index / run.sceneIds.length, `${agent.name}: ${scene?.title ?? 'skipped scene'} (${index + 1} of ${run.sceneIds.length})`)
      const body = scene ? (await book.repository.read(scene.path).catch(() => null))?.body ?? '' : ''
      if (!scene || !body.trim()) continue
      const output = await options.review(await scenePrompt(book, agent, scene, body, options.model), options.signal)
      options.signal?.throwIfAborted()
      const stored = await storeFindings(book, { runId, agent, entryId: scene.id, body, output }, now())
      run = await upsertReviewRun(book.state, { ...run, findings: run.findings + stored.length })
    }
    await options.progress?.(1, `${agent.name}: done`)
    return await upsertReviewRun(book.state, { ...run, status: 'done', finishedAt: now().toISOString() })
  }
  catch (error) {
    const cancelled = options.signal?.aborted ?? false
    await upsertReviewRun(book.state, { ...run, status: cancelled ? 'cancelled' : 'failed', error: cancelled ? null : (error instanceof Error ? error.message : String(error)), finishedAt: now().toISOString() })
    publishCommentEvent(book.id, { entryId: run.sceneIds[0] ?? '' })
    throw error
  }
}
