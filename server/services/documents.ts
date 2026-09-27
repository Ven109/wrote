import type { EntryDocument, SaveDocumentInput, SceneMeta, UpdateDocumentMetaInput } from '#shared/schemas/document'
import { applyChange } from '../db/indexer'
import type { StoredEntry } from '../storage/entries'
import type { BookContext } from './workspace'

function toDocument(entry: StoredEntry): EntryDocument {
  return {
    id: entry.frontmatter.id,
    path: entry.path,
    type: entry.type,
    title: entry.frontmatter.title,
    body: entry.body,
    hash: entry.hash,
    frontmatter: entry.frontmatter,
  }
}

export async function readDocument(book: BookContext, path: string): Promise<EntryDocument> {
  return toDocument(await book.repository.read(path))
}

/**
 * Saves the body of an entry, keeping its frontmatter and bumping `updated`.
 * Unchanged bodies are not rewritten; a stale `expectedHash` raises a conflict.
 */
export async function saveDocumentBody(book: BookContext, input: SaveDocumentInput, now = new Date()): Promise<EntryDocument> {
  const entry = await book.repository.read(input.path)
  if (entry.body === input.body && (!input.expectedHash || input.expectedHash === entry.hash)) return toDocument(entry)
  const frontmatter = { ...entry.frontmatter, updated: now.toISOString() }
  const saved = await book.repository.write(entry.path, { frontmatter, body: input.body }, input.expectedHash)
  await applyChange(book.db, book.repository, { kind: 'changed', path: entry.path })
  return toDocument(saved)
}

/** Applies a metadata patch: `null` removes a key, `undefined` keeps it. */
export function applyMetaPatch(frontmatter: Record<string, unknown>, meta: SceneMeta): Record<string, unknown> {
  const cleared = new Set(Object.entries(meta).filter(([, value]) => value === null || value === '').map(([key]) => key))
  const set = Object.entries(meta).filter(([key, value]) => value !== undefined && !cleared.has(key))
  const kept = Object.entries(frontmatter).filter(([key]) => !cleared.has(key))
  return { ...Object.fromEntries(kept), ...Object.fromEntries(set) }
}

/** Updates frontmatter fields (scene metadata) without touching the body. */
export async function updateDocumentMeta(book: BookContext, input: UpdateDocumentMetaInput, now = new Date()): Promise<EntryDocument> {
  const entry = await book.repository.read(input.path)
  const frontmatter = { ...applyMetaPatch(entry.frontmatter, input.meta), updated: now.toISOString() }
  const saved = await book.repository.write(entry.path, { frontmatter: frontmatter as typeof entry.frontmatter, body: entry.body }, entry.hash)
  await applyChange(book.db, book.repository, { kind: 'changed', path: entry.path })
  return toDocument(saved)
}
