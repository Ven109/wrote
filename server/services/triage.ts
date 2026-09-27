import type { TriageLink, TriageSuggestions } from '#shared/schemas/triage'
import { createNameMatcher } from '#shared/utils/name-matcher'
import { linkedTargets, rankTags } from '#shared/utils/triage'
import { InvalidInputError } from '../storage/errors'
import { mentionTargets } from './mentions'
import { searchBook } from './search'
import { getStructure, type StructureNode } from './structure'
import type { BookContext } from './workspace'

const MAX_LINKS = 5
const QUERY_CHARS = 1000

async function tagsOf(book: BookContext, ids: string[]): Promise<string[][]> {
  if (!ids.length) return []
  const result = await book.db.$client.execute({ sql: `SELECT entry_id, tag FROM tags WHERE entry_id IN (${ids.map(() => '?').join(', ')})`, args: ids })
  return ids.map(id => result.rows.filter(row => String(row.entry_id) === id).map(row => String(row.tag)))
}

/** Codex entries named in the note (title or alias) first, then similar ones found by (hybrid) search. */
async function suggestLinks(book: BookContext, text: string, linked: Set<string>): Promise<TriageLink[]> {
  const targets = await mentionTargets(book)
  const isLinked = (id: string, title: string) => linked.has(id) || linked.has(title.toLowerCase())
  const matcher = createNameMatcher(targets.flatMap(target => target.names.map(name => ({ name, entryId: target.id }))))
  const mentioned = [...new Set(matcher.find(text).map(match => match.entryId))]
  const hits = await searchBook(book, text.slice(0, QUERY_CHARS), { types: ['codex'], limit: MAX_LINKS, anyTerm: true })
  const links: TriageLink[] = [
    ...mentioned.map(id => targets.find(target => target.id === id)!).map(target => ({ id: target.id, title: target.title, type: 'codex' as const, reason: 'mentioned' as const })),
    ...hits.map(hit => ({ id: hit.id, title: hit.title, type: hit.type, reason: 'related' as const })),
  ]
  return links.filter((link, index) => !isLinked(link.id, link.title) && links.findIndex(other => other.id === link.id) === index).slice(0, MAX_LINKS)
}

const chapterOf = (parts: StructureNode[], id: string): StructureNode | undefined => parts
  .flatMap(part => part.children)
  .find(chapter => chapter.id === id || chapter.children.some(scene => scene.id === id))

/** The chapter whose text is most like the note (hybrid search over scenes and chapters). */
async function suggestChapter(book: BookContext, text: string, linked: Set<string>): Promise<TriageSuggestions['chapter']> {
  const hits = await searchBook(book, text.slice(0, QUERY_CHARS), { types: ['scene', 'chapter'], limit: 3, anyTerm: true })
  const structure = await getStructure(book.db)
  const chapter = hits.map(hit => chapterOf(structure, hit.id)).find(Boolean)
  return chapter && !linked.has(chapter.title.toLowerCase()) && !linked.has(chapter.id) ? { id: chapter.id, title: chapter.title, path: chapter.path } : null
}

/**
 * Triage suggestions for a note: tags used on similar notes, codex entries to link, and the chapter it
 * belongs to. Computed from the index (no AI call), so they are instant and work offline; with an embedding
 * model, search also matches by meaning.
 */
export async function triageNote(book: BookContext, path: string): Promise<TriageSuggestions> {
  const note = await book.repository.read(path)
  if (note.type !== 'note') throw new InvalidInputError(`${path} is not a note`)
  const text = `${note.frontmatter.title}\n\n${note.body}`
  const linked = linkedTargets(note.body)
  const similar = (await searchBook(book, text.slice(0, QUERY_CHARS), { types: ['note'], limit: 8, anyTerm: true })).filter(hit => hit.id !== note.frontmatter.id)
  const [links, chapter, neighbourTags] = await Promise.all([suggestLinks(book, text, linked), suggestChapter(book, text, linked), tagsOf(book, similar.map(hit => hit.id))])
  return { tags: rankTags(neighbourTags, note.frontmatter.tags ?? []), links, chapter }
}
