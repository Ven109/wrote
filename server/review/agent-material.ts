import type { ReviewAgent } from '#shared/schemas/review'
import type { StoredEntry } from '../storage/entries'
import { listBeats } from '../services/outline'
import { searchBook } from '../services/search'
import { buildTimeline } from '../services/timeline'
import type { BookContext } from '../services/workspace'
import { lineHeuristics } from './heuristics'

const MAX_RESEARCH = 6
const MAX_RESEARCH_CHARS = 2_500
const DETAILS = ['pov', 'location', 'timeline', 'status'] as const

/** The scene's own frontmatter details (POV, location, timeline) – continuity needs them. */
function sceneDetails(scene: StoredEntry): string {
  const lines = DETAILS.map(key => [key, scene.frontmatter[key]] as const).filter(([, value]) => typeof value === 'string' && value.trim()).map(([key, value]) => `- ${key}: ${String(value)}`)
  return lines.length ? `Scene details:\n${lines.join('\n')}` : ''
}

async function outlineMaterial(book: BookContext, sceneId: string): Promise<string> {
  const beats = await listBeats(book, { sceneId })
  if (!beats.length) return 'Outline: this scene is not linked to a beat.'
  return `Outline beats this scene tells:\n${beats.map(beat => `- ${beat.actTitle} › ${beat.title}${beat.summary ? `: ${beat.summary.replace(/\s+/g, ' ')}` : ''}`).join('\n')}`
}

/** Research notes that match the scene's words (for the fact checker), with their paths to cite. */
async function researchMaterial(book: BookContext, text: string): Promise<string> {
  const query = [...new Set(text.toLowerCase().match(/\b[a-z]{5,}\b/g) ?? [])].slice(0, 60).join(' ')
  const hits = query ? await searchBook(book, query, { types: ['research'], limit: MAX_RESEARCH, anyTerm: true }) : []
  const notes: string[] = []
  for (const hit of hits) {
    const note = await book.repository.read(hit.path).catch(() => null)
    if (note?.body.trim()) notes.push(`<note title="${hit.title}" path="${hit.path}">\n${note.body.trim().slice(0, MAX_RESEARCH_CHARS)}\n</note>`)
  }
  return notes.length ? `<research>\n${notes.join('\n')}\n</research>` : 'Research notes: none match this scene.'
}

function heuristicMaterial(text: string): string {
  const flags = lineHeuristics(text)
  return flags.length ? `Heuristic flags (candidates):\n${flags.map(flag => `- [${flag.category}] ${flag.note}: "${flag.quote}"`).join('\n')}` : 'Heuristic flags: none.'
}

const TIMELINE_AROUND = 6

/** Scenes and events just before and after this scene in in-world order, with where everyone is. */
async function timelineMaterial(book: BookContext, sceneId: string): Promise<string> {
  const { items } = await buildTimeline(book)
  const index = items.findIndex(item => item.id === sceneId)
  if (index < 0) return 'Timeline: this scene has no in-world date.'
  const around = items.slice(Math.max(0, index - TIMELINE_AROUND), index + TIMELINE_AROUND + 1)
  const line = (item: typeof items[number]) => `- ${item.date}: ${item.kind} "${item.title}"${item.id === sceneId ? ' (this scene)' : ''}${item.pov ? `, POV ${item.pov}` : ''}${item.location ? `, at ${item.location}` : ''}`
  return `Timeline around this scene (in-world order):\n${around.map(line).join('\n')}`
}

/** Extra material for an agent's scene prompt, per its tools, plus the scene's details. */
export async function agentMaterial(book: BookContext, agent: ReviewAgent, scene: StoredEntry): Promise<string[]> {
  const parts = [sceneDetails(scene)]
  if (agent.tools.includes('outline')) parts.push(await outlineMaterial(book, scene.frontmatter.id))
  if (agent.tools.includes('research')) parts.push(await researchMaterial(book, scene.body))
  if (agent.tools.includes('heuristics')) parts.push(heuristicMaterial(scene.body))
  if (agent.tools.includes('timeline')) parts.push(await timelineMaterial(book, scene.frontmatter.id))
  if (agent.summary) parts.push('Also write the scene summary your instructions ask for (the `summary` field).')
  return parts.filter(Boolean)
}
