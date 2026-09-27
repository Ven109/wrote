import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import type { CodexProposal } from '#shared/schemas/codex-proposals'
import { getModelWithRef } from '../ai/models'
import { ExtractionOutputSchema } from '../codex/extraction'
import { extractWith, scanForCodex } from '../services/codex-extraction'
import { defineWroteTool, ToolError } from './define'

const view = (proposals: CodexProposal[]) => ({
  proposals: proposals.map(({ id, action, codexType, title, aliases, fields, evidence }) => ({ id, action, codexType, title, aliases, fields, evidence })),
  note: 'Proposals appear in Wrote for the author to accept, edit or reject. Nothing was written to the codex.',
})

export const extractCodexTool = defineWroteTool({
  name: 'extract_codex',
  title: 'Scan for codex entries',
  description: 'Scans a chapter, scene or part with Wrote\'s configured AI model and proposes new codex entries (characters, places, …) and new facts for existing ones, each backed by quotes from the text. Proposals are only stored for the author to review – the codex is not changed. If you can read the text yourself, prefer propose_codex_entries.',
  permission: 'propose',
  input: z.object({ entryId: EntryIdSchema.describe('Chapter, scene or part id (see get_structure)') }),
  async handler({ entryId }, { book, caller }) {
    const configured = await getModelWithRef(book!.workspaceDir, 'chat')
    if (!configured) throw new ToolError('No AI model is configured in Wrote. Read the text and use propose_codex_entries instead.', 'ai_not_configured')
    return view(await scanForCodex(book!, entryId, { extract: extractWith(configured.model), model: configured.ref, author: caller }))
  },
})

export const proposeCodexEntriesTool = defineWroteTool({
  name: 'propose_codex_entries',
  title: 'Propose codex entries',
  description: 'Proposes codex entries you found in a chapter, scene or part (read it with read_entry first; check get_codex for existing entries). Each entry needs evidence: short quotes copied exactly from that text – entries whose quotes are not in the text are dropped. Names of existing entries become proposals to add the new facts. The author reviews every proposal; replaces earlier pending proposals for the same text.',
  permission: 'propose',
  input: z.object({
    entryId: EntryIdSchema.describe('The chapter, scene or part the entries come from'),
    entries: ExtractionOutputSchema.shape.entries.max(100),
  }),
  async handler({ entryId, entries }, { book, caller }) {
    return view(await scanForCodex(book!, entryId, { extract: async () => ({ entries }), model: null, author: caller }))
  },
})
