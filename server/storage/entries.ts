import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { entryTypeFromPath } from '#shared/book/layout'
import { parseFrontmatter, type Entry, type EntryType } from '#shared/schemas/entry'
import { parseMarkdownFile } from '#shared/utils/frontmatter'
import { EntryParseError, NotFoundError } from './errors'
import { hashContent } from './fs'
import { relativeToBook, resolveInBook } from './paths'

/** An entry as stored on disk, with a content hash for conflict detection. */
export type StoredEntry<T extends EntryType = EntryType> = Entry<T> & { hash: string }

const IGNORED_DIRS = new Set(['.wrote', '.git', 'node_modules'])

/** Parses Markdown source into a typed entry. Throws `EntryParseError` for invalid files. */
export function parseEntry(path: string, source: string): StoredEntry {
  const type = entryTypeFromPath(path)
  if (!type) throw new EntryParseError(path, 'not an entry location')
  try {
    const { data, body } = parseMarkdownFile(source)
    return { type, path, frontmatter: parseFrontmatter(type, data), body, hash: hashContent(source) }
  }
  catch (error) {
    throw new EntryParseError(path, error instanceof Error ? error.message : String(error))
  }
}

export async function readEntry(root: string, path: string): Promise<StoredEntry> {
  const absolute = resolveInBook(root, path)
  let source: string
  try {
    source = await readFile(absolute, 'utf8')
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundError(path)
    throw error
  }
  return parseEntry(path, source)
}

/** Recursively lists all Markdown files that are entry locations (book-relative POSIX paths, sorted). */
export async function listEntryPaths(root: string): Promise<string[]> {
  const found: string[] = []
  async function walk(dir: string) {
    const items = await readdir(dir, { withFileTypes: true })
    for (const item of items) {
      if (item.name.startsWith('.') && item.isDirectory()) continue
      if (IGNORED_DIRS.has(item.name)) continue
      const absolute = join(dir, item.name)
      if (item.isDirectory()) await walk(absolute)
      else if (entryTypeFromPath(relativeToBook(root, absolute))) found.push(relativeToBook(root, absolute))
    }
  }
  await walk(root)
  return found.sort()
}

/** Loads every entry. Invalid files are reported in `errors` instead of failing the whole book. */
export async function listEntries(root: string): Promise<{ entries: StoredEntry[], errors: EntryParseError[] }> {
  const entries: StoredEntry[] = []
  const errors: EntryParseError[] = []
  for (const path of await listEntryPaths(root)) {
    try {
      entries.push(await readEntry(root, path))
    }
    catch (error) {
      if (error instanceof EntryParseError) errors.push(error)
      else throw error
    }
  }
  return { entries, errors }
}
