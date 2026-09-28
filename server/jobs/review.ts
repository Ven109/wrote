import { z } from 'zod'
import { getModelWithRef, reviewRoute } from '../ai/models'
import { reviewAgent } from '../services/review-agents'
import { executeReviewRun, REVIEW_JOB, reviewWith } from '../services/review-runs'
import { getReviewRun } from '../db/state/review-runs'
import { defineWroteJob } from './define'

/** A review agent's pass over a scene, chapter or the whole book; findings arrive as margin comments. */
export const reviewJob = defineWroteJob({
  kind: REVIEW_JOB,
  title: 'Review',
  input: z.object({ runId: z.string() }),
  maxAttempts: 1,
  async run({ book, input, signal, progress }) {
    const run = await getReviewRun(book.state, input.runId)
    if (!run) throw new Error(`Review run ${input.runId} not found`)
    const agent = await reviewAgent(book, run.agentId)
    const configured = await getModelWithRef(book.workspaceDir, reviewRoute(agent.task), { bookId: book.id, feature: 'review' })
    if (!configured) throw new Error('No AI model is configured – set one up under AI models')
    const done = await executeReviewRun(book, run.id, { review: reviewWith(configured.model), model: configured.ref, signal, progress })
    return { findings: done.findings }
  },
})
