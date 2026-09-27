import { z } from 'zod'
import { EntryIdSchema, EntryTypeSchema } from '#shared/schemas/entry'
import { readBookConfig } from '../storage/config'
import { getEntry } from '../services/entries'
import { getProgress } from '../services/progress'
import { searchBook } from '../services/search'
import { getStructure } from '../services/structure'
import { listBookIds } from '../services/workspace'
import { defineWroteTool } from './define'
import { join } from 'node:path'

const MAX_CHARS = 20_000

export const listBooksTool = defineWroteTool({
  name: 'list_books',
  title: 'List books',
  description: 'Lists all books in the Wrote workspace with their id, title and author. Use the id as `bookId` in other tools.',
  permission: 'read',
  requiresBook: false,
  input: z.object({}),
  async handler(_input, { workspaceDir }) {
    const ids = await listBookIds(workspaceDir)
    return Promise.all(ids.map(async (id) => {
      const config = await readBookConfig(join(workspaceDir, id))
      return { id, title: config.title, author: config.author ?? null }
    }))
  },
})

export const searchTool = defineWroteTool({
  name: 'search',
  title: 'Search the book',
  description: 'Searches the manuscript, notes, codex and research of the book by words and, when semantic search is set up, by meaning – so descriptive queries like "scenes where Mara feels guilty" work too. Returns ranked hits with the entry id, path, type, title, a snippet (word matches wrapped in <mark>) and `match` ("text", "meaning" or "both"). Use read_entry to get the full text of a hit.',
  permission: 'read',
  input: z.object({
    query: z.string().min(1).describe('Words or a description of what to find'),
    types: z.array(EntryTypeSchema).optional().describe('Only return these entry types'),
    tags: z.array(z.string()).optional(),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  handler: (input, { book }) => searchBook(book!, input.query, { types: input.types, tags: input.tags, limit: input.limit }),
})

export const readEntryTool = defineWroteTool({
  name: 'read_entry',
  title: 'Read an entry',
  description: 'Reads one entry (scene, note, codex entry, research, outline, style guide) by id or path: frontmatter and Markdown body. Long bodies are paginated: pass `offset` from `nextOffset` to continue.',
  permission: 'read',
  input: z.object({
    id: EntryIdSchema.optional(),
    path: z.string().optional(),
    offset: z.number().int().min(0).default(0),
    maxChars: z.number().int().min(500).max(MAX_CHARS).default(MAX_CHARS),
  }).refine(v => v.id || v.path, 'Provide id or path'),
  async handler(input, { book }) {
    const entry = await getEntry(book!.db, book!.repository, input)
    const body = entry.body.slice(input.offset, input.offset + input.maxChars)
    const end = input.offset + body.length
    return {
      id: entry.frontmatter.id,
      path: entry.path,
      type: entry.type,
      frontmatter: entry.frontmatter,
      body,
      nextOffset: end < entry.body.length ? end : null,
    }
  },
})

export const getStructureTool = defineWroteTool({
  name: 'get_structure',
  title: 'Get manuscript structure',
  description: 'Returns the manuscript tree: parts → chapters → scenes, in reading order, with ids, titles, scene status and word counts.',
  permission: 'read',
  input: z.object({}),
  handler: (_input, { book }) => getStructure(book!.db),
})

export const getProgressTool = defineWroteTool({
  name: 'get_progress',
  title: 'Get writing progress',
  description: 'Returns word counts (total and per scene status) and counts of scenes, notes, inbox notes and codex entries.',
  permission: 'read',
  input: z.object({}),
  handler: (_input, { book }) => getProgress(book!.db),
})
