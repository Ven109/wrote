import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FindingsOutput } from '#shared/schemas/review'
import { createTestWorkspace } from '../../test/utils/workspace'
import { listReviewRuns } from '../db/state/review-runs'
import { listComments } from './comments'
import { createReviewRun, estimateReview, executeReviewRun, planReview, type ReviewFn } from './review-runs'
import { dismissFinding, suggestFindingFix } from './review-findings'
import { listSuggestions, resolveSuggestions } from './suggestions'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterEach(() => closeAllBooks())

const ARRIVAL = 'scn_arr1val001'
const finding = (quote: string, extra: Partial<FindingsOutput['findings'][number]> = {}) => ({ quote, severity: 'medium' as const, category: 'phrasing', message: 'Could be sharper.', suggestion: null, ...extra })

/** A fake model: the findings for each scene come from `byScene` (matched by the scene title in the prompt). */
function fake(byScene: Record<string, FindingsOutput['findings']>) {
  const prompts: { system: string, prompt: string }[] = []
  const review: ReviewFn = async (prompt) => {
    prompts.push(prompt)
    const title = Object.keys(byScene).find(name => prompt.prompt.includes(`"${name}"`))
    return { findings: title ? byScene[title]! : [] }
  }
  return { prompts, review }
}

async function run(scope: 'scene' | 'chapter' | 'book', targetId: string | undefined, review: ReviewFn, signal?: AbortSignal) {
  const plan = await planReview(book, { agentId: 'editor', scope, targetId })
  const created = await createReviewRun(book, plan, scope)
  return executeReviewRun(book, created.id, { review, model: 'test:model', signal })
}

describe('planning and estimates', () => {
  it('reviews the scenes of a scene, chapter or book', async () => {
    expect((await planReview(book, { agentId: 'editor', scope: 'scene', targetId: ARRIVAL })).scenes.map(scene => scene.id)).toEqual([ARRIVAL])
    expect((await planReview(book, { agentId: 'editor', scope: 'chapter', targetId: 'chp_harb0r0001' })).scenes.map(scene => scene.id)).toEqual([ARRIVAL, 'scn_themap0001'])
    const whole = await planReview(book, { agentId: 'editor', scope: 'book' })
    expect(whole).toMatchObject({ targetId: null, targetTitle: 'Whole book' })
    expect(whole.scenes).toHaveLength(3)
    const estimate = await estimateReview(book, whole, 'test:model')
    expect(estimate).toMatchObject({ scenes: 3, calls: 3, cost: null })
    expect(estimate.inputTokens).toBeGreaterThan(100)
  })

  it('refuses a mismatched target, unknown agents and entries', async () => {
    await expect(planReview(book, { agentId: 'editor', scope: 'chapter', targetId: ARRIVAL })).rejects.toThrow(/not a chapter/)
    await expect(planReview(book, { agentId: 'nobody', scope: 'scene', targetId: ARRIVAL })).rejects.toThrow(/nobody/)
    await expect(planReview(book, { agentId: 'editor', scope: 'scene', targetId: 'scn_missing001' })).rejects.toThrow(/scn_missing001/)
  })
})

describe('running a review', () => {
  it('stores anchored findings as comments, drops invented quotes and records the run', async () => {
    const model = fake({ Arrival: [
      finding('The harbor smelled of salt and tar', { severity: 'low', category: 'imagery', suggestion: 'The harbor stank of salt and tar' }),
      finding('A sentence that is not in the scene'),
    ] })
    const done = await run('scene', ARRIVAL, model.review)
    expect(done).toMatchObject({ status: 'done', findings: 1, model: 'test:model', sceneIds: [ARRIVAL] })
    expect(model.prompts[0]!.prompt).toContain('The tide was out')
    expect(model.prompts[0]!.system).toContain('# Editor')
    const [comment] = await listComments(book, { entryId: ARRIVAL })
    expect(comment).toMatchObject({
      quote: 'The harbor smelled of salt and tar',
      body: 'Could be sharper.',
      author: { kind: 'agent', name: 'Editor' },
      detached: false,
      review: { runId: done.id, agentId: 'editor', severity: 'low', category: 'imagery', suggestion: 'The harbor stank of salt and tar', dismissed: false },
    })
    expect(await listReviewRuns(book.state, { sceneId: ARRIVAL })).toMatchObject([{ id: done.id, status: 'done' }])
    expect(await listReviewRuns(book.state, { sceneId: 'scn_meet1ng001' })).toEqual([])
  })

  it('does not raise open or dismissed findings again on a rerun', async () => {
    const model = fake({ Arrival: [finding('The harbor smelled of salt and tar'), finding('She had promised herself she would never come back.', { category: 'pacing' })] })
    await run('scene', ARRIVAL, model.review)
    const [first] = await listComments(book, { entryId: ARRIVAL })
    await dismissFinding(book, first!.id)
    const again = await run('scene', ARRIVAL, model.review)
    expect(again.findings).toBe(0)
    const open = await listComments(book, { entryId: ARRIVAL })
    expect(open.map(comment => comment.review?.category)).toEqual(['pacing'])
  })

  it('keeps what a cancelled run found so far', async () => {
    const controller = new AbortController()
    const review: ReviewFn = async (prompt) => {
      if (prompt.prompt.includes('"The Map"')) controller.abort()
      return { findings: prompt.prompt.includes('"Arrival"') ? [finding('The tide was out')] : [] }
    }
    await expect(run('chapter', 'chp_harb0r0001', review, controller.signal)).rejects.toThrow()
    const [latest] = await listReviewRuns(book.state)
    expect(latest).toMatchObject({ status: 'cancelled', findings: 1 })
  })
})

describe('fixes', () => {
  it('turns a finding\'s fix into a suggestion; accepting it resolves the finding', async () => {
    await run('scene', ARRIVAL, fake({ Arrival: [finding('The harbor smelled of salt and tar', { suggestion: 'The harbor stank of salt and tar' })] }).review)
    const [comment] = await listComments(book, { entryId: ARRIVAL })
    const suggestion = await suggestFindingFix(book, comment!.id)
    expect(suggestion).toMatchObject({ entryId: ARRIVAL, find: 'The harbor smelled of salt and tar', replace: 'The harbor stank of salt and tar', rationale: 'Could be sharper.' })
    expect((await listSuggestions(book, { entryId: ARRIVAL }))).toHaveLength(1)
    await resolveSuggestions(book, { ids: [suggestion.id], status: 'accepted' })
    expect(await listComments(book, { entryId: ARRIVAL })).toEqual([])
  })

  it('refuses a fix for findings without one', async () => {
    await run('scene', ARRIVAL, fake({ Arrival: [finding('The tide was out')] }).review)
    const [comment] = await listComments(book, { entryId: ARRIVAL })
    await expect(suggestFindingFix(book, comment!.id)).rejects.toThrow(/no suggested fix/)
  })
})
