import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { addComment, listComments } from '../services/comments'
import { InvalidInputError } from '../storage/errors'
import { defineWroteTool, ToolError } from './define'

export const addCommentTool = defineWroteTool({
  name: 'add_comment',
  title: 'Add a comment',
  description: 'Adds a comment to a passage of an entry – for critique, questions or notes on the text. It appears live in the author\'s editor margin, next to the passage; the text itself is not changed. `quote` must be a short, exact passage that occurs once in the entry body (Markdown, as read_entry returns it). Use one comment per point.',
  permission: 'propose',
  input: z.object({
    entryId: EntryIdSchema,
    quote: z.string().min(1).max(2000).describe('Exact passage the comment refers to (unique in the entry)'),
    body: z.string().min(1).max(10_000).describe('The comment (Markdown)'),
  }),
  async handler(input, { book, caller }) {
    try {
      const comment = await addComment(book!, { ...input, author: caller })
      return { commentId: comment.id }
    }
    catch (error) {
      if (error instanceof InvalidInputError) throw new ToolError(error.message, 'anchor_not_unique')
      throw error
    }
  },
})

export const listCommentsTool = defineWroteTool({
  name: 'list_comments',
  title: 'List comments',
  description: 'Lists comments on the book or one entry: the quoted passage, comment, author, replies, and `detached` when the passage has since changed. Open comments only, unless includeResolved.',
  permission: 'read',
  input: z.object({
    entryId: EntryIdSchema.optional(),
    includeResolved: z.boolean().default(false),
  }),
  handler: (input, { book }) => listComments(book!, input),
})
