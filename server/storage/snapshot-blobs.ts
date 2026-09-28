import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { gunzip, gzip } from 'node:zlib'

const zip = promisify(gzip)
const unzip = promisify(gunzip)

/** Snapshot contents are content-addressed, gzipped blobs: identical files are stored once. */
const objectsDir = (root: string) => join(root, '.wrote', 'snapshots', 'objects')
export const contentHash = (content: string) => createHash('sha256').update(content).digest('hex')

export async function writeBlob(root: string, content: string): Promise<string> {
  const hash = contentHash(content)
  const path = join(objectsDir(root), `${hash}.gz`)
  await mkdir(objectsDir(root), { recursive: true })
  await writeFile(path, await zip(content), { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error
  })
  return hash
}

export async function readBlob(root: string, hash: string): Promise<string> {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid snapshot blob ${hash}`)
  return (await unzip(await readFile(join(objectsDir(root), `${hash}.gz`)))).toString('utf8')
}

/** Removes blobs no snapshot references any more. */
export async function pruneBlobs(root: string, keep: Set<string>): Promise<number> {
  const names = await readdir(objectsDir(root)).catch(() => [] as string[])
  const stale = names.filter(name => !keep.has(name.replace(/\.gz$/, '')))
  await Promise.all(stale.map(name => rm(join(objectsDir(root), name), { force: true })))
  return stale.length
}
