import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FindingsOutput } from '#shared/schemas/review'
import { getModelWithRef } from '../ai/models'
import { listComments } from '../services/comments'
import { createReviewRun, executeReviewRun, planReview, reviewWith, type ReviewFn } from '../services/review-runs'
import { closeAllBooks, openBook, type BookContext } from '../services/workspace'
import { createTestWorkspace } from '../../test/utils/workspace'
import { BUILTIN_AGENTS } from './builtin-agents'
import { scoreReview, type PlantedIssue } from './eval'

/**
 * Review agent eval: a chapter with planted issues per agent (fixture book = sample book + this chapter).
 * In CI it runs on recorded model answers (checks the pipeline and the scoring); with
 * `WROTE_EVAL_WORKSPACE=<dir>` (`pnpm eval:review`) it uses that workspace's configured models and prints
 * each agent's real recall and precision.
 */
const FIXTURE = join(import.meta.dirname, '../../test/fixtures/review-eval')
const REAL_WORKSPACE = process.env.WROTE_EVAL_WORKSPACE
const AGENTS = ['continuity', 'line-editor', 'developmental', 'beta-reader', 'fact-checker'] as const
let book: BookContext
let chapterId: string

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
  const chapter = await book.repository.create({ type: 'chapter', dir: 'manuscript/01-part-one', title: 'The Keeper' })
  const dir = chapter.path.replace(/\/index\.md$/, '')
  await book.repository.create({ type: 'scene', dir, title: 'The Lighthouse', body: await readFile(join(FIXTURE, 'the-lighthouse.md'), 'utf8'), frontmatter: { pov: 'Mara Velden', location: 'Hollow Bay', timeline: 'Day 2' } })
  await book.repository.create({ type: 'scene', dir, title: 'Waiting', body: await readFile(join(FIXTURE, 'waiting.md'), 'utf8'), frontmatter: { pov: 'Mara Velden', location: 'Hollow Bay', timeline: 'Day 2' } })
  await book.settle()
  chapterId = String(chapter.frontmatter.id)
})
afterAll(() => closeAllBooks())

/** Recorded answers, keyed by agent and scene title. */
async function recorded(agentId: string): Promise<ReviewFn> {
  const outputs = JSON.parse(await readFile(join(FIXTURE, 'mock-outputs.json'), 'utf8')) as Record<string, Record<string, FindingsOutput['findings']>>
  return async prompt => ({ findings: Object.entries(outputs[agentId] ?? {}).find(([title]) => prompt.prompt.includes(`"${title}"`))?.[1] ?? [], summary: null })
}

async function runAgent(agentId: string) {
  const agent = BUILTIN_AGENTS.find(candidate => candidate.id === agentId)!
  const configured = REAL_WORKSPACE ? await getModelWithRef(REAL_WORKSPACE, agent.task) : null
  if (REAL_WORKSPACE && !configured) throw new Error(`No model configured in ${REAL_WORKSPACE}`)
  const plan = await planReview(book, { agentId, scope: 'chapter', targetId: chapterId })
  const run = await createReviewRun(book, plan, 'chapter')
  await executeReviewRun(book, run.id, { review: configured ? reviewWith(configured.model) : await recorded(agentId), model: configured?.ref ?? 'recorded' })
  const titles = new Map(plan.scenes.map(scene => [scene.id, scene.title]))
  const comments = (await listComments(book, { includeResolved: true })).filter(comment => comment.review?.runId === run.id)
  return comments.map(comment => ({ scene: titles.get(comment.entryId) ?? '', quote: comment.quote, category: comment.review!.category }))
}

describe('review agent eval', () => {
  it('scores each built-in agent on the planted issues', { timeout: REAL_WORKSPACE ? 900_000 : 30_000 }, async () => {
    const expected = JSON.parse(await readFile(join(FIXTURE, 'expected.json'), 'utf8')) as Record<string, PlantedIssue[]>
    const rows: string[] = []
    for (const agentId of AGENTS) {
      const score = scoreReview(expected[agentId]!, await runAgent(agentId))
      rows.push(`${agentId.padEnd(14)} recall ${(score.recall * 100).toFixed(0).padStart(3)}%  precision ${(score.precision * 100).toFixed(0).padStart(3)}%  (${score.caught}/${score.planted} planted, ${score.findings} findings)${score.missed.length ? `  missed: ${score.missed.map(issue => issue.note ?? issue.quote).join('; ')}` : ''}`)
      if (!REAL_WORKSPACE) {
        // The recorded line editor misses the repeated "lamp"; everything else is caught.
        expect(score.recall).toBe(agentId === 'line-editor' ? 3 / 4 : 1)
      }
      else if (agentId === 'continuity') expect(score.recall).toBeGreaterThanOrEqual(0.8)
    }
    console.info(`[eval] review agents (${REAL_WORKSPACE ? 'configured models' : 'recorded answers'})\n${rows.join('\n')}`)
  })
})

describe('scoreReview', () => {
  it('matches planted passages by overlap within the same scene, or anywhere for scene-level issues', () => {
    const score = scoreReview(
      [{ scene: 'A', quote: 'brown eyes' }, { scene: 'B', quote: null }, { scene: 'A', quote: 'missing one' }],
      [{ scene: 'A', quote: 'Mara\'s brown eyes', category: 'x' }, { scene: 'B', quote: 'Anything', category: 'x' }, { scene: 'A', quote: 'unrelated', category: 'x' }],
    )
    expect(score).toMatchObject({ planted: 3, caught: 2, findings: 3, relevant: 2 })
    expect(score.missed).toEqual([{ scene: 'A', quote: 'missing one' }])
  })
})
