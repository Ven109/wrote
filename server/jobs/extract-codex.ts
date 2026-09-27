import { z } from 'zod'
import { getModelWithRef } from '../ai/models'
import { extractWith, EXTRACT_CODEX_JOB, scanForCodex } from '../services/codex-extraction'
import { defineWroteJob } from './define'

/** "Scan chapter": finds codex entries in a manuscript text and stores them as proposals to review. */
export const extractCodexJob = defineWroteJob({
  kind: EXTRACT_CODEX_JOB,
  title: 'Scan for codex entries',
  input: z.object({ entryId: z.string() }),
  maxAttempts: 2,
  async run({ book, input, signal, progress }) {
    const configured = await getModelWithRef(book.workspaceDir, 'chat')
    if (!configured) throw new Error('No AI model is configured – set one up under AI models')
    await progress(0.1, 'Reading the text…')
    const proposals = await scanForCodex(book, input.entryId, { extract: extractWith(configured.model), model: configured.ref, author: { kind: 'assistant', name: 'Scan chapter' }, signal })
    return { proposals: proposals.length }
  },
})
