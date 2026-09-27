import type { z } from 'zod'
import type { BookContext } from '../services/workspace'

export interface JobContext<I> {
  input: I
  book: BookContext
  /** Aborted when the job is cancelled or the server shuts down. Pass it to long operations. */
  signal: AbortSignal
  /** Reports progress (0…1) and an optional status line; pushed live to clients. */
  progress: (value: number, message?: string) => Promise<void>
  attempt: number
}

export interface WroteJob<I extends z.ZodType = z.ZodType, R = unknown> {
  kind: string
  title: string
  input: I
  /** Jobs of this kind running at once per book (default 1). */
  concurrency: number
  /** Attempts before the job fails for good (default 3). */
  maxAttempts: number
  run: (context: JobContext<z.infer<I>>) => Promise<R>
}

/** Defines a background job kind (long AI workflows, re-indexing, transcription, …). */
export function defineWroteJob<I extends z.ZodType, R>(job: Omit<WroteJob<I, R>, 'concurrency' | 'maxAttempts'> & Partial<Pick<WroteJob<I, R>, 'concurrency' | 'maxAttempts'>>): WroteJob<I, R> {
  return { concurrency: 1, maxAttempts: 3, ...job }
}
