import { access, mkdir, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { FOLDER_INDEX_FILE } from '#shared/book/layout'
import type { EntryType, FrontmatterByType } from '#shared/schemas/entry'
import { createId } from '#shared/utils/ids'
import { formatOrderedName, parseOrderedName } from '#shared/utils/order'
import { slugify } from '#shared/utils/slug'
import { NotFoundError } from './errors'
import { listOrderedChildren } from './reorder'
import { resolveInBook } from './paths'
import { writeEntry, type WriteOptions } from './write'
import type { StoredEntry } from './entries'

const FOLDER_TYPES = new Set<EntryType>(['part', 'chapter'])
const ORDERED_TYPES = new Set<EntryType>(['part', 'chapter', 'scene'])

export interface CreateEntryInput<T extends EntryType = EntryType> {
  type: T
  /** Book-relative folder to create the entry in (e.g. `manuscript/01-part-one` or `notes/inbox`). */
  dir: string
  title: string
  body?: string
  frontmatter?: Partial<FrontmatterByType[T]>
}

async function exists(path: string) {
  return access(path).then(() => true, () => false)
}

async function nextOrder(root: string, dir: string): Promise<number> {
  if (!(await exists(resolveInBook(root, dir)))) return 1
  const children = await listOrderedChildren(root, dir)
  const last = children.at(-1)
  return last ? parseOrderedName(last.replace(/\.md$/, '')).order! + 1 : 1
}

async function uniqueName(root: string, dir: string, base: string, ext: string): Promise<string> {
  let name = `${base}${ext}`
  for (let n = 2; await exists(resolveInBook(root, `${dir}/${name}`)); n++) name = `${base}-${n}${ext}`
  return name
}

/** Creates a new entry with a fresh id and a filename derived from its title (ordered for manuscript). */
export async function createEntry(root: string, input: CreateEntryInput, options: WriteOptions = {}): Promise<StoredEntry> {
  const slug = slugify(input.title)
  const base = ORDERED_TYPES.has(input.type) ? formatOrderedName(await nextOrder(root, input.dir), slug) : slug
  const isFolder = FOLDER_TYPES.has(input.type)
  const name = await uniqueName(root, input.dir, base, isFolder ? '' : '.md')
  const path = isFolder ? `${input.dir}/${name}/${FOLDER_INDEX_FILE}` : `${input.dir}/${name}`
  const now = new Date().toISOString()
  const frontmatter = { ...input.frontmatter, id: createId(input.type), title: input.title, created: now, updated: now }
  return writeEntry(root, path, { frontmatter: frontmatter as FrontmatterByType[EntryType], body: input.body ?? '' }, options)
}

/** The filesystem node that represents an entry: its folder for parts/chapters, else the file. */
export function entryNodePath(path: string): string {
  return path.endsWith(`/${FOLDER_INDEX_FILE}`) ? dirname(path) : path
}

/** Moves an entry (or its whole folder) into the trash inside `.wrote/`, never deleting data. */
export async function trashEntry(root: string, path: string): Promise<string> {
  const node = entryNodePath(path)
  const source = resolveInBook(root, node)
  if (!(await exists(source))) throw new NotFoundError(path)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const trashPath = `.wrote/trash/${stamp}/${node}`
  const target = resolveInBook(root, trashPath)
  await mkdir(dirname(target), { recursive: true })
  await rename(source, target)
  return trashPath
}

/** Moves an entry (file or folder) into another folder, appending it at the end for ordered types. */
export async function moveEntry(root: string, path: string, targetDir: string): Promise<string> {
  const node = entryNodePath(path)
  const source = resolveInBook(root, node)
  if (!(await exists(source))) throw new NotFoundError(path)
  const name = node.split('/').at(-1)!
  const isFile = name.endsWith('.md')
  const stem = isFile ? name.slice(0, -3) : name
  const { order, slug } = parseOrderedName(stem)
  const base = order === null ? slug : formatOrderedName(await nextOrder(root, targetDir), slug)
  const nextName = await uniqueName(root, targetDir, base, isFile ? '.md' : '')
  await mkdir(resolveInBook(root, targetDir), { recursive: true })
  await rename(source, resolveInBook(root, `${targetDir}/${nextName}`))
  return isFile ? `${targetDir}/${nextName}` : `${targetDir}/${nextName}/${FOLDER_INDEX_FILE}`
}
