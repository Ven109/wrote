import { readdir, readFile } from 'node:fs/promises'
import { SuggestionSchema, type Actor, type Suggestion } from '#shared/schemas/suggestion'
import { NotFoundError } from '../storage/errors'
import { writeFileAtomic } from '../storage/fs'
import { resolveInBook } from '../storage/paths'

const DIR = '.wrote/suggestions'

function createSuggestionId(): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return `sug_${[...bytes].map(b => alphabet[b % alphabet.length]).join('')}`
}

export interface ProposeInput {
  entryId: string
  find: string
  replace: string
  rationale?: string
  author: Actor
}

/** Stores a pending suggestion. Suggestions live in `.wrote/suggestions/` until accepted or rejected. */
export async function createSuggestion(root: string, input: ProposeInput): Promise<Suggestion> {
  const suggestion = SuggestionSchema.parse({ ...input, id: createSuggestionId(), status: 'pending', createdAt: new Date().toISOString() })
  await writeFileAtomic(resolveInBook(root, `${DIR}/${suggestion.id}.json`), `${JSON.stringify(suggestion, null, 2)}\n`)
  return suggestion
}

export async function listSuggestions(root: string, filter: { entryId?: string, status?: Suggestion['status'] } = {}): Promise<Suggestion[]> {
  let files: string[]
  try {
    files = (await readdir(resolveInBook(root, DIR))).filter(name => name.endsWith('.json'))
  }
  catch {
    return []
  }
  const all = await Promise.all(files.map(async name => SuggestionSchema.parse(JSON.parse(await readFile(resolveInBook(root, `${DIR}/${name}`), 'utf8')))))
  return all
    .filter(s => (!filter.entryId || s.entryId === filter.entryId) && (!filter.status || s.status === filter.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getSuggestion(root: string, id: string): Promise<Suggestion> {
  const all = await listSuggestions(root)
  const found = all.find(s => s.id === id)
  if (!found) throw new NotFoundError(`Suggestion ${id}`)
  return found
}

export async function saveSuggestion(root: string, suggestion: Suggestion): Promise<Suggestion> {
  const parsed = SuggestionSchema.parse(suggestion)
  await writeFileAtomic(resolveInBook(root, `${DIR}/${parsed.id}.json`), `${JSON.stringify(parsed, null, 2)}\n`)
  return parsed
}
