import { FOLDER_INDEX_FILE } from '#shared/book/layout'
import type { StructureNode } from '#shared/schemas/manuscript'
import { applyChange, syncIndex } from '../db/indexer'
import { InvalidPathError } from '../storage/errors'
import { entryNodePath } from '../storage/mutations'
import { pathForId } from './entries'
import { getStructure } from './structure'
import type { BookContext } from './workspace'

const PARENT_TYPE = { part: null, chapter: 'part', scene: 'chapter' } as const

/** Folder that contains the children of a part/chapter entry. */
function childFolder(indexPath: string): string {
  return indexPath.replace(new RegExp(`/${FOLDER_INDEX_FILE}$`), '')
}

function nodeName(path: string): string {
  return entryNodePath(path).split('/').at(-1)!
}

async function parentFolderFor(book: BookContext, type: StructureNode['type'], parentId?: string): Promise<string> {
  const expected = PARENT_TYPE[type]
  if (!expected) return 'manuscript'
  if (!parentId) throw new InvalidPathError(`A ${type} needs a parent ${expected}`)
  const row = await book.db.$client.execute({ sql: 'SELECT path, type FROM entries WHERE id = ?', args: [parentId] })
  if (row.rows[0]?.type !== expected) throw new InvalidPathError(`Parent of a ${type} must be a ${expected}`)
  return childFolder(String(row.rows[0]!.path))
}

/** Syncs the index right away so the structure reflects renames before the watcher catches up. */
async function resync(book: BookContext) {
  await syncIndex(book.db, book.repository)
}

export async function createNode(book: BookContext, input: { type: StructureNode['type'], title: string, parentId?: string }) {
  const dir = await parentFolderFor(book, input.type, input.parentId)
  const entry = await book.repository.create({ type: input.type, dir, title: input.title, frontmatter: input.type === 'scene' ? { status: 'draft' } : {} })
  await applyChange(book.db, book.repository, { kind: 'added', path: entry.path })
  return { id: entry.frontmatter.id, path: entry.path }
}

export async function renameNode(book: BookContext, id: string, title: string) {
  const entry = await book.repository.read(await pathForId(book.db, id))
  const saved = await book.repository.write(entry.path, { frontmatter: { ...entry.frontmatter, title, updated: new Date().toISOString() }, body: entry.body }, entry.hash)
  return { id, title: saved.frontmatter.title }
}

export async function trashNode(book: BookContext, id: string) {
  await book.repository.trash(await pathForId(book.db, id))
  await resync(book)
}

/**
 * Moves a part/chapter/scene to `index` among the children of `parentId` (or its current parent),
 * renumbering siblings. Works across parents (e.g. a scene into another chapter).
 */
export async function moveNode(book: BookContext, id: string, target: { parentId?: string, index: number }) {
  const row = await book.db.$client.execute({ sql: 'SELECT path, type FROM entries WHERE id = ?', args: [id] })
  if (!row.rows[0]) throw new InvalidPathError(`Unknown entry ${id}`)
  const type = String(row.rows[0].type) as StructureNode['type']
  if (!(type in PARENT_TYPE)) throw new InvalidPathError('Only parts, chapters and scenes can be moved')
  let path = String(row.rows[0].path)
  const currentFolder = entryNodePath(path).replace(/\/[^/]+$/, '')
  const targetFolder = target.parentId ? await parentFolderFor(book, type, target.parentId) : currentFolder

  if (targetFolder !== currentFolder) path = await book.repository.move(path, targetFolder)
  const siblings = await book.repository.listOrdered(targetFolder)
  const name = nodeName(path)
  const others = siblings.filter(sibling => sibling !== name)
  const index = Math.min(target.index, others.length)
  await book.repository.reorder(targetFolder, [...others.slice(0, index), name, ...others.slice(index)])
  await resync(book)
  return getStructure(book.db)
}
