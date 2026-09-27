import { z } from 'zod'
import { syncIndex } from '../db/indexer'
import { defineWroteJob } from './define'

/** Rebuilds the search index of the book from its Markdown files. */
export const reindexJob = defineWroteJob({
  kind: 'reindex',
  title: 'Rebuild search index',
  input: z.object({ force: z.boolean().default(true) }).default({ force: true }),
  maxAttempts: 1,
  async run({ input, book, signal, progress }) {
    const result = await syncIndex(book.db, book.repository, {
      force: input.force,
      signal,
      onProgress: (done, total) => progress(total ? done / total : 1, `${done} of ${total} entries`),
    })
    return { indexed: result.indexed, removed: result.removed, errors: result.errors.length }
  },
})
