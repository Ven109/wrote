import { readFile } from 'node:fs/promises'
import { BOOK_CONFIG_FILE, BookConfigSchema, type BookConfig, type BookConfigInput } from '#shared/schemas/book'
import { NotFoundError } from './errors'
import { writeFileAtomic } from './fs'
import { resolveInBook } from './paths'

export async function readBookConfig(root: string): Promise<BookConfig> {
  try {
    return BookConfigSchema.parse(JSON.parse(await readFile(resolveInBook(root, BOOK_CONFIG_FILE), 'utf8')))
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundError(BOOK_CONFIG_FILE)
    throw error
  }
}

export async function writeBookConfig(root: string, config: BookConfigInput): Promise<BookConfig> {
  const parsed = BookConfigSchema.parse(config)
  await writeFileAtomic(resolveInBook(root, BOOK_CONFIG_FILE), `${JSON.stringify(parsed, null, 2)}\n`)
  return parsed
}
