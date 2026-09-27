import { z } from 'zod'
import { getEmbeddingModel } from '../ai/models'
import { EMBED_JOB, embedIndex, embedTextsWith } from '../services/embeddings'
import { defineWroteJob } from './define'

/** Computes vectors for new or changed passages (semantic search). Queued after edits, unique per book. */
export const embedJob = defineWroteJob({
  kind: EMBED_JOB,
  title: 'Update semantic search',
  input: z.object({}).default({}),
  maxAttempts: 3,
  async run({ book, signal, progress }) {
    const configured = await getEmbeddingModel(book.workspaceDir)
    if (!configured) return { skipped: 'No embedding model configured' }
    return embedIndex(book.db, { embed: embedTextsWith(configured.model), model: configured.ref, signal, progress })
  },
})
