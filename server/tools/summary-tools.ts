import { z } from 'zod'
import { summaryOutline } from '../services/summary-edits'
import { defineWroteTool } from './define'

export const getSummariesTool = defineWroteTool({
  name: 'get_summaries',
  title: 'Get book summaries',
  description: 'Returns the rolling summaries of the book: a whole-book summary and the outline (parts → chapters, optionally → scenes) with a short summary of each. Use it first to understand the story so far or to find where something happens, then read_entry for details. Summaries are kept current in the background and may lag behind the latest edits; `summary` is null where none exists yet (summaries may be switched off).',
  permission: 'read',
  input: z.object({
    includeScenes: z.boolean().default(false).describe('Also include each scene with its summary (longer output)'),
  }),
  handler: (input, { book }) => summaryOutline(book!, { includeScenes: input.includeScenes }),
})
