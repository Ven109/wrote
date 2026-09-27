import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { createSuggestion, listSuggestions } from '../services/suggestions'
import { InvalidInputError } from '../storage/errors'
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
  description: 'Proposes a change to an entry\'s text without applying it – the author sees it as a tracked change to accept, edit or reject. `find` must be an exact, unique passage currently in the entry body (Markdown, as read_entry returns it). mode "replace" (default) replaces `find` with `replace`; mode "insert_after" adds `replace` as new paragraph(s) after the paragraph containing `find`. Keep `find` short but unique. Always use this instead of rewriting manuscript text directly.',
  permission: 'propose',
  input: z.object({
    entryId: EntryIdSchema,
    find: z.string().min(1).describe('Exact existing text: the passage to replace, or (insert_after) text in the paragraph to insert after. Must occur exactly once'),
    replace: z.string().describe('Proposed replacement text, or the new paragraph(s) to insert (Markdown)'),
    mode: z.enum(['replace', 'insert_after']).default('replace'),
    rationale: z.string().max(2000).optional().describe('Why this change improves the text'),
  }),
  async handler(input, { book, caller }) {
    try {
      const suggestion = await createSuggestion(book!, { entryId: input.entryId, find: input.find, replace: input.replace, rationale: input.rationale, kind: input.mode === 'insert_after' ? 'insert' : 'replace', author: caller })
      return { suggestionId: suggestion.id, status: suggestion.status }
    }
    catch (error) {
      if (error instanceof InvalidInputError) throw new ToolError(error.message, 'anchor_not_unique')
      throw error
    }
  },
})

export const listSuggestionsTool = defineWroteTool({
  name: 'list_suggestions',
  title: 'List suggestions',
  description: 'Lists proposed edits (suggestions) for the book or one entry: status (pending, accepted, rejected), author, rationale, and `stale` when the text they refer to has since changed.',
  permission: 'read',
  input: z.object({
    entryId: EntryIdSchema.optional(),
    status: z.enum(['pending', 'accepted', 'rejected', 'stale']).optional(),
  }),
  handler: (input, { book }) => listSuggestions(book!, input),
})
