import { z } from 'zod'
import { buildTimeline } from '../services/timeline'
import { defineWroteTool } from './define'

export const timelineQueryTool = defineWroteTool({
  name: 'timeline_query',
  title: 'Query the timeline',
  description: 'Returns scenes and events in in-world order (dates from scene `timeline` frontmatter and event codex entries, read with the book\'s calendars), each with its date, the characters and places involved (codex ids) and, for scenes, POV and location. Filter by a character or place codex id and/or a date range (`from`, `to` in the book\'s date formats, e.g. "Day 3" or "1890-05-12"). Use it for continuity: who is where when, what happened before a scene.',
  permission: 'read',
  input: z.object({
    character: z.string().optional().describe('Codex id of a character'),
    place: z.string().optional().describe('Codex id of a place'),
    from: z.string().max(100).optional(),
    to: z.string().max(100).optional(),
  }),
  async handler(input, { book }) {
    const view = await buildTimeline(book!, input)
    return {
      items: view.items.map(({ id, kind, title, date, endKey, pov, location, characters, places }) => ({ id, kind, title, date, lasts: endKey !== null, pov, location, characters, places })),
      undated: view.undated.length,
    }
  },
})
