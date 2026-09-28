import { z } from 'zod'
import { refreshSummaries } from '../services/summaries'
import { generateWith, getSummaryModel, SUMMARIZE_JOB } from '../services/summary-jobs'
import { defineWroteJob } from './define'

/** Keeps scene, chapter, part and book summaries current with the fast model, within the daily token budget. */
export const summarizeJob = defineWroteJob({
  kind: SUMMARIZE_JOB,
  title: 'Update summaries',
  input: z.object({}).default({}),
  maxAttempts: 3,
  async run({ book, signal, progress }) {
    const configured = await getSummaryModel(book.workspaceDir, book.id)
    if (!configured) return { skipped: 'Summaries are off or no model is configured' }
    return refreshSummaries(book, { generate: generateWith(configured.model), model: configured.ref, dailyTokenBudget: configured.dailyTokenBudget, signal, progress })
  },
})
