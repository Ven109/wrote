import { randomBytes } from 'node:crypto'
import { readdir, rename } from 'node:fs/promises'
import { extname } from 'node:path'
import { formatOrderedName, parseOrderedName } from '#shared/utils/order'
import { InvalidPathError } from './errors'
import { resolveInBook } from './paths'

/** Lists ordered children (`NN-slug` files/folders) of a manuscript folder, in order. */
export async function listOrderedChildren(root: string, dir: string): Promise<string[]> {
  const items = await readdir(resolveInBook(root, dir), { withFileTypes: true })
  return items
    .map(item => item.name)
    .filter(name => parseOrderedName(name.replace(/\.md$/, '')).order !== null)
    .sort((a, b) => parseOrderedName(a).order! - parseOrderedName(b).order!)
}

/**
 * Renames the children of `dir` so their numeric prefixes follow `ordered` (names as returned by
 * `listOrderedChildren`). Two-phase (temp names, then final) so swaps never collide; rolls back on error.
 * Returns a map of old name → new name for names that changed.
 */
export async function reorderChildren(root: string, dir: string, ordered: string[]): Promise<Map<string, string>> {
  const current = await listOrderedChildren(root, dir)
  if (ordered.length !== current.length || ordered.some(name => !current.includes(name))) {
    throw new InvalidPathError(`${dir}: reorder list must contain exactly the current children`)
  }
  const width = Math.max(2, String(ordered.length).length)
  const renames = new Map<string, string>()
  ordered.forEach((name, index) => {
    const ext = extname(name) === '.md' ? '.md' : ''
    const { slug } = parseOrderedName(name.slice(0, name.length - ext.length))
    const next = `${formatOrderedName(index + 1, slug, width)}${ext}`
    if (next !== name) renames.set(name, next)
  })
  await applyRenames(root, dir, renames)
  return renames
}

async function applyRenames(root: string, dir: string, renames: Map<string, string>) {
  const tag = randomBytes(4).toString('hex')
  const abs = (name: string) => resolveInBook(root, `${dir}/${name}`)
  const staged: [string, string][] = []
  const done: [string, string][] = []
  try {
    for (const [from] of renames) {
      const temp = `.reorder-${tag}-${from}`
      await rename(abs(from), abs(temp))
      staged.push([from, temp])
    }
    for (const [from, temp] of staged) {
      await rename(abs(temp), abs(renames.get(from)!))
      done.push([from, renames.get(from)!])
    }
  }
  catch (error) {
    for (const [from, to] of done.reverse()) await rename(abs(to), abs(from)).catch(() => {})
    for (const [from, temp] of staged) await rename(abs(temp), abs(from)).catch(() => {})
    throw error
  }
}
