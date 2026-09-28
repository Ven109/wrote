import type { ReviewAgent } from '#shared/schemas/review'

const agent = (definition: Omit<ReviewAgent, 'source' | 'task' | 'tools' | 'summary'> & Partial<Pick<ReviewAgent, 'task' | 'tools' | 'summary'>>): ReviewAgent =>
  ({ task: 'chat', tools: [], summary: false, source: 'builtin', ...definition })

/** Agents shipped with Wrote. Custom agents (the book's `agents/` folder) use the same shape. */
export const BUILTIN_AGENTS: ReviewAgent[] = [
  agent({
    id: 'editor',
    name: 'Editor',
    description: 'A general editorial read: clarity, consistency, awkward phrasing and anything that pulls a reader out.',
    instructions: [
      'Read the scene as an experienced fiction editor.',
      'Report only concrete problems worth the author\'s time: unclear sentences, awkward or repetitive phrasing, inconsistencies within the scene, and moments that break immersion.',
      'Prefer fewer, well-chosen findings (at most eight) over many small ones. Offer a replacement only when a direct rewrite of the quoted passage fixes it.',
    ].join(' '),
    scopes: ['scene', 'chapter', 'book'],
    categories: ['clarity', 'phrasing', 'consistency', 'immersion'],
  }),
  agent({
    id: 'continuity',
    name: 'Continuity',
    description: 'Contradictions with the codex, the timeline and earlier scenes: appearance, places, dates, who knows what.',
    instructions: [
      'You check continuity. Compare the scene with the codex entries, scene details (POV, location, timeline), the timeline around it and summaries in the book context.',
      'Report contradictions only: a character\'s appearance, traits or fears that differ from the codex; places described differently; dates, ages or durations that do not add up; characters knowing something they cannot know yet, or forgetting something they know.',
      'Name the source of the contradiction in the message (e.g. "The codex says her eyes are grey").',
      'Do not report style. If there is no contradiction, return no findings.',
    ].join(' '),
    scopes: ['scene', 'chapter', 'book'],
    tools: ['timeline'],
    categories: ['appearance', 'character', 'place', 'timeline', 'knowledge'],
  }),
  agent({
    id: 'line-editor',
    name: 'Line editor',
    description: 'Sentence-level polish: repetition, filter words, adverbs, passive voice and the book\'s style guide.',
    instructions: [
      'You are a line editor. Look at sentences: repeated words close together, filter words that distance the reader (felt, saw, heard, noticed, realized), weak adverbs, unnecessary passive voice, clichés, and breaches of the style guide in the book context.',
      'The heuristic flags below are candidates found by simple rules; confirm the ones that really weaken the prose and ignore the rest.',
      'Every finding should come with a replacement for the quoted passage that keeps the author\'s voice.',
    ].join(' '),
    scopes: ['scene', 'chapter'],
    tools: ['heuristics'],
    categories: ['repetition', 'filter-words', 'adverbs', 'passive-voice', 'style-guide', 'cliche'],
  }),
  agent({
    id: 'developmental',
    name: 'Developmental editor',
    description: 'Structure: scene goal, conflict and outcome, stakes, pacing and character arcs.',
    instructions: [
      'You are a developmental editor. Judge the scene as a unit of story: does it have a goal, conflict and outcome? Are the stakes clear? Does it move the plot or a character arc (see the outline beats it tells)? Is the pacing right for its place in the book?',
      'Report structural problems only, anchored to the passage where the problem shows (for a scene without conflict, quote its first sentence).',
      'Explain what is missing and suggest a direction in the message; do not rewrite prose (suggestion null).',
    ].join(' '),
    scopes: ['chapter', 'book'],
    tools: ['outline'],
    categories: ['goal', 'conflict', 'stakes', 'pacing', 'arc'],
  }),
  agent({
    id: 'beta-reader',
    name: 'Beta reader',
    description: 'A first reader\'s reactions in the margin – confused, bored, hooked, moved – and how engaging each scene is.',
    instructions: [
      'You are a beta reader, not an editor. Read the scene in order and react where a reader would: confused, bored, hooked, moved, amused, skeptical.',
      'Use the reaction as the category and write the message in first person, like a margin note ("I lost track of who is speaking here").',
      'Positive reactions count as much as negative ones; use severity low for positive reactions. Never offer replacements (suggestion null).',
      'Also write a two-sentence summary of how engaging the scene was and where your attention dropped.',
    ].join(' '),
    scopes: ['scene', 'chapter'],
    summary: true,
    categories: ['confused', 'bored', 'hooked', 'moved', 'amused', 'skeptical'],
  }),
  agent({
    id: 'fact-checker',
    name: 'Fact checker',
    description: 'Factual claims checked against the book\'s research notes; unsupported claims and missing citations.',
    instructions: [
      'You check facts. Find factual claims about the real world in the text (dates, numbers, science, history, places).',
      'Compare each with the research notes below: report claims the notes contradict (cite the note title in the message) and important claims no note supports (category unsupported).',
      'Ignore invented story facts. Offer a corrected replacement only when a note gives the right fact.',
    ].join(' '),
    scopes: ['scene', 'chapter', 'book'],
    tools: ['research'],
    categories: ['contradicted', 'unsupported', 'citation'],
  }),
]
