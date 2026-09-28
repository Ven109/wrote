import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export function hashContent(content: string): string {
  return createHash('sha1').update(content).digest('hex')
}

/** Writes via a temp file + rename so readers never see a half-written file. */
export async function writeFileAtomic(path: string, content: string, options: { mode?: number } = {}): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${randomBytes(6).toString('hex')}.tmp`
  try {
    await writeFile(temp, content, { encoding: 'utf8', mode: options.mode })
    await rename(temp, path)
  }
  catch (error) {
    await rm(temp, { force: true })
    throw error
  }
}

export async function readTextIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

/** The `.md` files directly in a folder (name → content), or `null` when the folder does not exist. */
export async function readMarkdownFiles(dir: string): Promise<Map<string, string> | null> {
  let names: string[]
  try {
    names = await readdir(dir)
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  const files = new Map<string, string>()
  for (const name of names.filter(candidate => candidate.endsWith('.md')).sort()) {
    const content = await readTextIfExists(`${dir}/${name}`)
    if (content !== null) files.set(name, content)
  }
  return files
}
