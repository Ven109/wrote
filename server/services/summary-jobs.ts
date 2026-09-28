import { generateText, type LanguageModel } from 'ai'
import { entryTypeFromPath } from '#shared/book/layout'
import type { Job } from '#shared/schemas/jobs'
import { getModelWithRef } from '../ai/models'
import { loadAiConfig } from './ai-settings'
import type { GenerateSummary } from './summaries'
import type { BookContext } from './workspace'

export const SUMMARIZE_JOB = 'summarize'
/** Summaries lag behind writing on purpose: one run after a minute of quiet, not one per autosave. */
export const SUMMARIZE_DEBOUNCE_MS = 60_000
const MANUSCRIPT_TYPES = new Set(['part', 'chapter', 'scene'])

export interface SummaryModel {
  model: LanguageModel
  ref: string
  dailyTokenBudget: number
}

/** The model for background summaries (the `summaries` route: fast tier unless set), or `null` when summaries are off or AI is not set up. */
export async function getSummaryModel(workspaceDir: string, bookId: string | null = null): Promise<SummaryModel | null> {
  const config = await loadAiConfig(workspaceDir)
  if (!config.settings.summaries.enabled) return null
  const configured = await getModelWithRef(workspaceDir, 'summaries', { bookId })
  return configured ? { ...configured, dailyTokenBudget: config.settings.summaries.dailyTokenBudget } : null
}

export function generateWith(model: LanguageModel): GenerateSummary {
  return async (prompt, signal) => {
    const result = await generateText({ model, system: prompt.system, prompt: prompt.prompt, maxOutputTokens: 400, abortSignal: signal, maxRetries: 1 })
    const tokens = result.usage.totalTokens ?? Math.ceil((prompt.system.length + prompt.prompt.length + result.text.length) / 4)
    return { text: result.text, tokens }
  }
}

/**
 * Queues a (unique, debounced) summary refresh when summaries are on – for changes to manuscript files
 * only (`path`), or unconditionally without a path (book opened, settings changed, summary reset).
 */
export async function scheduleSummaries(book: BookContext, options: { path?: string, delayMs?: number } = {}): Promise<Job | null> {
  if (options.path && !MANUSCRIPT_TYPES.has(entryTypeFromPath(options.path) ?? '')) return null
  if (!await getSummaryModel(book.workspaceDir)) return null
  return book.jobs.enqueue(SUMMARIZE_JOB, {}, { unique: true, delayMs: options.delayMs ?? SUMMARIZE_DEBOUNCE_MS })
}

/** Runs a settings change and queues a summary refresh for the given (open) books if it turned summaries on or changed their model. */
export async function withSummaryRefresh<T>(workspaceDir: string, books: BookContext[], change: () => Promise<T>): Promise<T> {
  const before = await getSummaryModel(workspaceDir)
  const result = await change()
  const after = await getSummaryModel(workspaceDir)
  if (after && after.ref !== before?.ref) await Promise.all(books.map(book => scheduleSummaries(book, { delayMs: 0 })))
  return result
}
