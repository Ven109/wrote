import { embed, embedMany } from 'ai'
import type { Job } from '#shared/schemas/jobs'
import { getEmbeddingModel, type ConfiguredEmbeddingModel } from '../ai/models'
import type { IndexDb } from '../db/client'
import { embeddingCoverage, pendingChunks, pruneEmbeddings, storeEmbeddings, useEmbeddingModel } from '../db/vectors'
import type { BookContext } from './workspace'

export const EMBED_JOB = 'embed'
/** Waits this long after a change before embedding, so a typing burst becomes one job. */
export const EMBED_DEBOUNCE_MS = 4000
const BATCH_SIZE = 32
const QUERY_TIMEOUT_MS = 8000

/** Embeds a batch of texts (vectors in input order). Injected so tests need no provider. */
export type EmbedTexts = (values: string[], signal: AbortSignal) => Promise<number[][]>

/** Embeds with a model; `onTokens` gets the tokens each batch used (usage log). */
export function embedTextsWith(model: ConfiguredEmbeddingModel['model'], onTokens?: (tokens: number) => Promise<unknown>): EmbedTexts {
  return async (values, signal) => {
    const result = await embedMany({ model, values, abortSignal: signal, maxRetries: 1 })
    await onTokens?.(result.usage.tokens).catch(() => undefined)
    return result.embeddings
  }
}

export interface EmbedResult {
  embedded: number
  pruned: number
  total: number
  /** True when the model changed and all vectors were recomputed. */
  reset: boolean
}

export interface EmbedIndexOptions {
  embed: EmbedTexts
  /** `provider:model` of the embedder. */
  model: string
  signal: AbortSignal
  progress?: (value: number, message: string) => Promise<void>
}

/** Embeds every chunk that has no vector yet (all of them after a model change) and prunes stale vectors. */
export async function embedIndex(db: IndexDb, options: EmbedIndexOptions): Promise<EmbedResult> {
  const reset = await useEmbeddingModel(db, options.model)
  const pruned = await pruneEmbeddings(db)
  const start = await embeddingCoverage(db)
  const todo = start.total - start.embedded
  let embedded = 0
  for (let batch = await pendingChunks(db, BATCH_SIZE); batch.length; batch = await pendingChunks(db, BATCH_SIZE)) {
    options.signal.throwIfAborted()
    await options.progress?.(todo ? embedded / todo : 1, `${embedded} of ${todo} passages`)
    const vectors = await options.embed(batch.map(chunk => chunk.text), options.signal)
    if (vectors.length !== batch.length) throw new Error(`Embedding model returned ${vectors.length} vectors for ${batch.length} texts`)
    options.signal.throwIfAborted()
    await storeEmbeddings(db, batch.map((chunk, i) => ({ hash: chunk.hash, vector: vectors[i]! })))
    embedded += batch.length
  }
  await options.progress?.(1, `${embedded} of ${todo} passages`)
  return { embedded, pruned, total: start.total, reset }
}

/** Whether every passage already has a vector from this model (nothing to do). */
async function upToDate(db: IndexDb, model: string): Promise<boolean> {
  const coverage = await embeddingCoverage(db)
  return coverage.model === model && coverage.embedded === coverage.total
}

/**
 * Queues a background re-embedding of the book if an embedding model is configured and some passages
 * lack vectors. Unique: bursts of changes join the already queued job; `delayMs` debounces them.
 */
export async function scheduleEmbedding(book: BookContext, delayMs = EMBED_DEBOUNCE_MS): Promise<Job | null> {
  const configured = await getEmbeddingModel(book.workspaceDir)
  if (!configured || await upToDate(book.db, configured.ref)) return null
  return book.jobs.enqueue(EMBED_JOB, {}, { unique: true, delayMs })
}

/**
 * Vector for a search query, or `null` when semantic search is unavailable: no model, no vectors yet,
 * vectors from another model, or the model does not answer in time (search then falls back to text).
 */
export async function embedQuery(book: BookContext, text: string): Promise<number[] | null> {
  const configured = await getEmbeddingModel(book.workspaceDir)
  if (!configured) return null
  const coverage = await embeddingCoverage(book.db)
  if (coverage.model !== configured.ref || !coverage.embedded) return null
  try {
    const { embedding } = await embed({ model: configured.model, value: text, abortSignal: AbortSignal.timeout(QUERY_TIMEOUT_MS), maxRetries: 0 })
    return embedding
  }
  catch (error) {
    console.warn('[wrote] query embedding failed, using full-text search only:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Runs a settings change and, if it made a different embedding model usable, queues re-embedding for
 * the given (open) books right away – their vectors are only comparable within one model.
 */
export async function withEmbeddingRefresh<T>(workspaceDir: string, books: BookContext[], change: () => Promise<T>): Promise<T> {
  const before = await getEmbeddingModel(workspaceDir)
  const result = await change()
  const after = await getEmbeddingModel(workspaceDir)
  if (after && after.ref !== before?.ref) await Promise.all(books.map(book => scheduleEmbedding(book, 0)))
  return result
}
