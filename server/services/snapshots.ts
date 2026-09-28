import type { Snapshot, SnapshotFileDiff, SnapshotSummary } from '#shared/schemas/snapshot'
import type { Actor } from '#shared/schemas/suggestion'
import { createRecordId } from '#shared/utils/ids'
import { locateNode } from '#shared/utils/manuscript-tree'
import { withoutUpdatedStamp } from '#shared/utils/block-diff'
import { countWords } from '#shared/utils/word-count'
import { deleteSnapshotRow, getSnapshot, insertSnapshot, listSnapshots, referencedHashes } from '../db/state/snapshots'
import { listBookTextFiles } from '../storage/entries'
import { NotFoundError } from '../storage/errors'
import { hashContent } from '../storage/fs'
import { pruneBlobs, readBlob, writeBlob } from '../storage/snapshot-blobs'
import { AUTHOR } from './activity'
import { commitSnapshot } from './snapshot-git'
import { getStructure } from './structure'
import type { BookContext } from './workspace'

/** Automatic snapshots kept per book (older ones are removed). Named snapshots are never removed automatically. */
export const MAX_AUTO_SNAPSHOTS = 100

const summary = ({ files, ...rest }: Snapshot): SnapshotSummary => ({ ...rest, fileCount: files.length })

/** The files a snapshot of the whole book, a chapter (index + scenes) or a scene holds. */
export async function scopeFiles(book: BookContext, entryId?: string): Promise<{ scope: Snapshot['scope'], paths: string[] }> {
  if (!entryId) return { scope: { kind: 'book', entryId: null, title: 'Whole book' }, paths: await listBookTextFiles(book.repository.root) }
  const node = locateNode(await getStructure(book.db), entryId)?.node
  if (!node) throw new NotFoundError(`Entry ${entryId}`)
  const collect = (n: typeof node): string[] => [n.path, ...n.children.flatMap(collect)]
  return { scope: { kind: 'entry', entryId, title: node.title }, paths: collect(node) }
}

interface SaveOptions {
  name: string
  scope: Snapshot['scope']
  /** Path → content (`null`: the file did not exist). */
  contents: Map<string, string | null>
  auto: boolean
  actor?: Actor
  now?: Date
}

/** Stores file contents as blobs and records the snapshot; manual snapshots are committed when git is on. */
export async function saveSnapshot(book: BookContext, options: SaveOptions): Promise<Snapshot> {
  const root = book.repository.root
  const files = await Promise.all([...options.contents].map(async ([path, content]) => ({ path, hash: content === null ? null : await writeBlob(root, content) })))
  const words = [...options.contents].filter(([path]) => path.endsWith('.md')).reduce((sum, [, content]) => sum + countWords(content?.replace(/^---\n[\s\S]*?\n---\n/, '') ?? ''), 0)
  const config = await book.repository.readConfig()
  const commit = !options.auto && config.snapshots.git ? await commitSnapshot(root, files.map(file => file.path), `Snapshot: ${options.name}`).catch(() => null) : null
  const snapshot = await insertSnapshot(book.state, {
    id: createRecordId('snap', 10),
    createdAt: (options.now ?? new Date()).toISOString(),
    name: options.name,
    auto: options.auto,
    scope: options.scope,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    actor: options.actor ?? AUTHOR,
    words,
    commit,
  })
  if (options.auto) await pruneAutoSnapshots(book)
  return snapshot
}

/** Takes a named snapshot of the whole book or of one chapter/scene. */
export async function createSnapshot(book: BookContext, input: { name: string, entryId?: string }, options: { actor?: Actor, auto?: boolean, now?: Date } = {}): Promise<Snapshot> {
  const { scope, paths } = await scopeFiles(book, input.entryId)
  const contents = new Map(await Promise.all(paths.map(async path => [path, await book.repository.readRaw(path)] as const)))
  return saveSnapshot(book, { name: input.name, scope, contents, auto: options.auto ?? false, actor: options.actor, now: options.now })
}

export async function listSnapshotSummaries(book: BookContext, filter: { path?: string } = {}): Promise<SnapshotSummary[]> {
  return (await listSnapshots(book.state, filter)).map(summary)
}

export async function requireSnapshot(book: BookContext, id: string): Promise<Snapshot> {
  const snapshot = await getSnapshot(book.state, id)
  if (!snapshot) throw new NotFoundError(`Snapshot ${id}`)
  return snapshot
}

/** Snapshot content of one file (`null`: it did not exist then). */
export const snapshotContent = (book: BookContext, file: Snapshot['files'][number]) => (file.hash ? readBlob(book.repository.root, file.hash) : Promise.resolve(null))

/** The snapshot's files compared with now – only the ones that differ (beyond their `updated` stamp). */
export async function diffSnapshot(book: BookContext, id: string, path?: string): Promise<SnapshotFileDiff[]> {
  const snapshot = await requireSnapshot(book, id)
  const files = path ? snapshot.files.filter(file => file.path === path) : snapshot.files
  if (path && !files.length) throw new NotFoundError(`${path} in snapshot ${id}`)
  const diffs = await Promise.all(files.map(async (file) => {
    const [before, after] = await Promise.all([snapshotContent(book, file), book.repository.readRaw(file.path)])
    return { path: file.path, before, after, currentHash: after === null ? null : hashContent(after) }
  }))
  return diffs.filter(diff => withoutUpdatedStamp(diff.before) !== withoutUpdatedStamp(diff.after))
}

export async function deleteSnapshot(book: BookContext, id: string): Promise<void> {
  if (!await deleteSnapshotRow(book.state, id)) throw new NotFoundError(`Snapshot ${id}`)
  await pruneBlobs(book.repository.root, await referencedHashes(book.state))
}

async function pruneAutoSnapshots(book: BookContext): Promise<void> {
  const stale = (await listSnapshots(book.state, { auto: true })).slice(MAX_AUTO_SNAPSHOTS)
  if (!stale.length) return
  for (const snapshot of stale) await deleteSnapshotRow(book.state, snapshot.id)
  await pruneBlobs(book.repository.root, await referencedHashes(book.state))
}
