import type { ReviewAgent } from '#shared/schemas/review'

/** Agents shipped with Wrote. */
export const BUILTIN_AGENTS: ReviewAgent[] = [
  {
    id: 'editor',
    name: 'Editor',
    description: 'A general editorial read: clarity, consistency, awkward phrasing and anything that pulls a reader out.',
    instructions: [
      'Read the scene as an experienced fiction editor.',
      'Report only concrete problems worth the author\'s time: unclear sentences, awkward or repetitive phrasing, inconsistencies within the scene, and moments that break immersion.',
      'Prefer fewer, well-chosen findings (at most eight) over many small ones. Offer a replacement only when a direct rewrite of the quoted passage fixes it.',
    ].join(' '),
    scopes: ['scene', 'chapter', 'book'],
    task: 'chat',
    categories: ['clarity', 'phrasing', 'consistency', 'immersion'],
    source: 'builtin',
  },
]
