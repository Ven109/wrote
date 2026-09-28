import { StartReviewSchema } from '#shared/schemas/review'
import { getModelWithRef } from '../../../../../ai/models'
import { upsertReviewRun } from '../../../../../db/state/review-runs'
import { createReviewRun, estimateReview, planReview, REVIEW_JOB } from '../../../../../services/review-runs'

/**
 * Starts a review (202 with the run and its job). A whole-book run first answers 409 `confirm_estimate` with
 * the estimate; the client asks the author and repeats the request with `confirmed: true`.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, StartReviewSchema.parse)
  const book = await requireBook(event)
  const plan = await withStorageErrors(() => planReview(book, input))
  const configured = await getModelWithRef(book.workspaceDir, plan.agent.task)
  if (!configured) throw createError({ statusCode: 409, statusMessage: 'Set up an AI model first (AI models in the sidebar)', data: { code: 'ai_not_configured' } })
  const estimate = await estimateReview(book, plan, configured.ref)
  if (input.scope === 'book' && !input.confirmed) throw createError({ statusCode: 409, statusMessage: 'Confirm the estimate to review the whole book', data: { code: 'confirm_estimate', estimate } })
  const run = await withStorageErrors(() => createReviewRun(book, plan, input.scope))
  const job = await book.jobs.enqueue(REVIEW_JOB, { runId: run.id })
  setResponseStatus(event, 202)
  return { run: await upsertReviewRun(book.state, { ...run, jobId: job.id }), estimate, job }
})
