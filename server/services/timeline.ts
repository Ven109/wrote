import type { CodexMentionTarget } from '#shared/schemas/codex'
import type { StructureNode } from '#shared/schemas/manuscript'
import type { TimelineConfig, TimelineItem, TimelineQuery, TimelineView } from '#shared/schemas/timeline'
import { formatInWorldDate, parseInWorldDate } from '#shared/utils/in-world-date'
import { createNameMatcher } from '#shared/utils/name-matcher'
import { applyChange } from '../db/indexer'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { getEntry } from './entries'
import { mentionTargets } from './mentions'
import { getStructure } from './structure'
import type { BookContext } from './workspace'

interface Row {
  id: string
  path: string
  title: string
  frontmatter: Record<string, unknown>
  body: string
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const ids = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' && value ? [value] : [])

async function rows(book: BookContext, where: string): Promise<Row[]> {
  const result = await book.db.$client.execute(`SELECT e.id, e.path, e.title, e.frontmatter, f.body FROM entries e LEFT JOIN entries_fts f ON f.id = e.id WHERE ${where} ORDER BY e.path`)
  return result.rows.map(row => ({ id: String(row.id), path: String(row.path), title: String(row.title), frontmatter: JSON.parse(String(row.frontmatter)) as Record<string, unknown>, body: String(row.body ?? '') }))
}

function chapterTitles(nodes: StructureNode[], chapter = '', into = new Map<string, string>()): Map<string, string> {
  for (const node of nodes) {
    if (node.type === 'scene') into.set(node.id, chapter)
    else chapterTitles(node.children, node.type === 'chapter' ? node.title : chapter, into)
  }
  return into
}

/** Which codex characters and places a scene involves: its POV and location, plus names in its text. */
function involved(row: Row, targets: CodexMentionTarget[], matcher: ReturnType<typeof createNameMatcher>, explicit: string[] = []) {
  const found = new Set([...explicit, ...matcher.find(`${text(row.frontmatter.pov) ?? ''}\n${text(row.frontmatter.location) ?? ''}\n${row.body}`).map(match => match.entryId)])
  const of = (type: string) => targets.filter(target => target.codexType === type && found.has(target.id)).map(target => target.id)
  return { characters: of('character'), places: of('place') }
}

/**
 * The book's timeline: scenes (`timeline` in their frontmatter) and events (codex entries of type `event`,
 * with `date` and optional `end`) in in-world order, with the characters and places each involves. Dates are
 * read with the book's calendars; items without a readable date are listed as undated.
 */
export async function buildTimeline(book: BookContext, query: TimelineQuery = {}): Promise<TimelineView> {
  const config: TimelineConfig = (await book.repository.readConfig()).timeline
  const [scenes, events, targets, structure] = await Promise.all([
    rows(book, `e.type = 'scene'`),
    rows(book, `e.type = 'codex' AND json_extract(e.frontmatter, '$.codexType') = 'event'`),
    mentionTargets(book),
    getStructure(book.db),
  ])
  const people = targets.filter(target => target.codexType === 'character' || target.codexType === 'place')
  const matcher = createNameMatcher(people.flatMap(target => target.names.map(name => ({ name, entryId: target.id }))))
  const chapters = chapterTitles(structure)
  const items: TimelineItem[] = []
  const undated: TimelineView['undated'] = []
  const add = (row: Row, kind: 'scene' | 'event', date: string | null, rest: Omit<TimelineItem, 'id' | 'kind' | 'title' | 'path' | 'date' | 'key'>) => {
    const parsed = date ? parseInWorldDate(date, config) : null
    if (!parsed) return undated.push({ id: row.id, kind, title: row.title, path: row.path, date })
    items.push({ id: row.id, kind, title: row.title, path: row.path, date: date!, key: parsed.key, ...rest })
  }
  for (const row of scenes) {
    add(row, 'scene', text(row.frontmatter.timeline), { endKey: null, group: chapters.get(row.id) ?? '', pov: text(row.frontmatter.pov), location: text(row.frontmatter.location), ...involved(row, people, matcher) })
  }
  for (const row of events) {
    const end = text(row.frontmatter.end)
    const endKey = end ? parseInWorldDate(end, config)?.key ?? null : null
    add(row, 'event', text(row.frontmatter.date), { endKey, group: 'Events', pov: null, location: null, ...involved(row, people, matcher, [...ids(row.frontmatter.participants), ...ids(row.frontmatter.place)]) })
  }
  const from = query.from ? parseInWorldDate(query.from, config)?.key : undefined
  const to = query.to ? parseInWorldDate(query.to, config)?.key : undefined
  const shown = items
    .filter(item => (!query.character || item.characters.includes(query.character)) && (!query.place || item.places.includes(query.place)))
    .filter(item => (from === undefined || (item.endKey ?? item.key) >= from) && (to === undefined || item.key < Math.floor(to) + 1))
    .sort((a, b) => a.key - b.key || a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path))
  const first = shown[0] ? parseInWorldDate(shown[0].date, config) : null
  const axis = first ? { ...first, hasTime: false } : null
  const used = new Set(items.flatMap(item => [...item.characters, ...item.places]))
  const pick = (type: string) => people.filter(target => target.codexType === type && used.has(target.id)).map(target => ({ id: target.id, title: target.title })).sort((a, b) => a.title.localeCompare(b.title))
  return { items: shown, undated, people: pick('character'), locations: pick('place'), axis, config }
}

/**
 * Moves a scene or event in time: writes the new date to its frontmatter (`timeline` of a scene, `date` of an
 * event – whose `end` moves along) in the format it was written in. Returns the new date text.
 */
export async function moveOnTimeline(book: BookContext, entryId: string, key: number): Promise<{ date: string, end: string | null }> {
  const config: TimelineConfig = (await book.repository.readConfig()).timeline
  const found = await getEntry(book.db, book.repository, { id: entryId }).catch(() => null)
  if (!found) throw new NotFoundError(`Entry ${entryId}`)
  const entry = await book.repository.read(found.path)
  const isEvent = entry.type === 'codex' && entry.frontmatter.codexType === 'event'
  if (entry.type !== 'scene' && !isEvent) throw new InvalidInputError('Only scenes and events are on the timeline')
  const field = isEvent ? 'date' : 'timeline'
  const current = parseInWorldDate(text(entry.frontmatter[field]) ?? '', config)
  if (!current) throw new InvalidInputError('This entry has no date the timeline can read – set one first')
  const date = formatInWorldDate(key, current, config)
  const endText = isEvent ? text(entry.frontmatter.end) : null
  const end = endText ? parseInWorldDate(endText, config) : null
  const newEnd = end ? formatInWorldDate(end.key + (key - current.key), end, config) : null
  await book.repository.write(entry.path, { frontmatter: { ...entry.frontmatter, [field]: date, ...(newEnd ? { end: newEnd } : {}) }, body: entry.body }, entry.hash)
  await applyChange(book.db, book.repository, { kind: 'changed', path: entry.path })
  return { date, end: newEnd }
}
