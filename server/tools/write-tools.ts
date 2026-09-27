import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { getEntry } from '../services/entries'
import { createSuggestion, listSuggestions } from '../services/suggestions'
import { defineWroteTool, ToolError } from './define'

export const createNoteTool = defineWroteTool({
  name: 'create_note',
  title: 'Create a note',
  description: 'Creates a new note in the book. By default it lands in the inbox (notes/inbox) for the author to triage. Use for ideas, research findings or reminders – never for manuscript text.',
  permission: 'write',
  input: z.object({
    title: z.string().min(1).max(200),
    body: z.string().max(50_000).default(''),
    tags: z.array(z.string()).default([]),
    inbox: z.boolean().default(true),
  }),
  async handler(input, { book }) {
    const entry = await book!.repository.create({
      type: 'note',
      dir: input.inbox ? 'notes/inbox' : 'notes',
      title: input.title,
      body: input.body,
      frontmatter: { tags: input.tags },
    })
    return { id: entry.frontmatter.id, path: entry.path, title: entry.frontmatter.title }
  },
})

export const proposeEditTool = defineWroteTool({
  name: 'propose_edit',
  title: 'Propose an edit',
  description: 'Proposes a change to an entry\'s text without applying it. `find` must be an exact, unique passage currently in the entry body; `replace` is the new text. The author sees it as a suggestion to accept or reject. Always use this instead of rewriting manuscript text directly.',
  permission: 'propose',
  input: z.object({
    entryId: EntryIdSchema,
    find: z.string().min(1).describe('Exact existing text to replace (must occur exactly once)'),
    replace: z.string().describe('Proposed replacement text'),
    rationale: z.string().max(2000).optional().describe('Why this change improves the text'),
  }),
  async handler(input, { book, caller }) {
    const entry = await getEntry(book!.db, book!.repository, { id: input.entryId })
    const occurrences = entry.body.split(input.find).length - 1
    if (occurrences !== 1) {
      throw new ToolError(occurrences === 0 ? '`find` text does not occur in the entry' : '`find` text occurs more than once – include more context', 'anchor_not_unique')
    }
    const suggestion = await createSuggestion(book!.root, { ...input, author: caller })
    return { suggestionId: suggestion.id, status: suggestion.status }
  },
})

export const listSuggestionsTool = defineWroteTool({
  name: 'list_suggestions',
  title: 'List suggestions',
  description: 'Lists proposed edits (suggestions) for the book or one entry, with their status (pending, accepted, rejected, stale).',
  permission: 'read',
  input: z.object({
    entryId: EntryIdSchema.optional(),
    status: z.enum(['pending', 'accepted', 'rejected', 'stale']).optional(),
  }),
  handler: (input, { book }) => listSuggestions(book!.root, input),
})
