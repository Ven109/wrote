import { entryTypeFromPath } from '#shared/book/layout'
import { frontmatterDefaults, parseFrontmatter, type EntryType, type FrontmatterByType } from '#shared/schemas/entry'
import { parseMarkdownFile, stringifyMarkdownFile } from '#shared/utils/frontmatter'
import { mergeFrontmatterForWrite } from '#shared/utils/frontmatter-merge'
import { ConflictError } from './errors'
import { hashContent, readTextIfExists, writeFileAtomic } from './fs'
import { resolveInBook } from './paths'
import { parseEntry, type StoredEntry } from './entries'

export interface WriteOptions {
  /** Hash of the version the caller edited. If the file changed since, a `ConflictError` is thrown. */
  expectedHash?: string
  /** Called with the written path + hash so the watcher can ignore our own writes. */
  onWrite?: (path: string, hash: string) => void
}

export interface EntryContent<T extends EntryType = EntryType> {
  frontmatter: FrontmatterByType[T]
  body: string
}

/** Validates and writes an entry atomically, with optimistic conflict detection. */
export async function writeEntry(root: string, path: string, content: EntryContent, options: WriteOptions = {}): Promise<StoredEntry> {
  const absolute = resolveInBook(root, path)
  const type = entryTypeFromPath(path)
  if (!type) throw new Error(`Not an entry location: ${path}`)

  const current = await readTextIfExists(absolute)
  if (options.expectedHash !== undefined && current !== null && hashContent(current) !== options.expectedHash) {
    throw new ConflictError(path)
  }

  const validated = parseFrontmatter(type, content.frontmatter) as Record<string, unknown>
  const raw = current === null ? {} : parseMarkdownFile(current).data
  const data = mergeFrontmatterForWrite(raw, validated, frontmatterDefaults(type))
  const source = stringifyMarkdownFile({ data, body: content.body })
  await writeFileAtomic(absolute, source)
  const entry = parseEntry(path, source)
  options.onWrite?.(path, entry.hash)
  return entry
}
