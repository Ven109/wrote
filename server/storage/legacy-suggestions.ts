import { readdir, readFile, rm } from 'node:fs/promises'
import { resolveInBook } from './paths'

const DIR = '.wrote/suggestions'

/** Raw contents of suggestion files from before suggestions moved into state.db (`.wrote/suggestions/*.json`). */
export async function readLegacySuggestionFiles(root: string): Promise<unknown[]> {
  const dir = resolveInBook(root, DIR)
  const files = (await readdir(dir).catch(() => [] as string[])).filter(name => name.endsWith('.json'))
  return Promise.all(files.map(async name => JSON.parse(await readFile(`${dir}/${name}`, 'utf8')) as unknown))
}

export async function removeLegacySuggestionFiles(root: string): Promise<void> {
  await rm(resolveInBook(root, DIR), { recursive: true, force: true })
}
