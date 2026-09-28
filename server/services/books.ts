import { access, mkdir, rename, stat } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'
import type { BookConfig } from '#shared/schemas/book'
import type { BookSummary, CreateBookInput, UpdateBookInput } from '#shared/schemas/library'
import { blockExportPolicy } from '#shared/utils/directives'
import { CreateBookSchema } from '#shared/schemas/library'
import { slugify } from '#shared/utils/slug'
import { readBookConfig, writeBookConfig } from '../storage/config'
import { InvalidPathError, NotFoundError } from '../storage/errors'
import { resolveInBook } from '../storage/paths'
import { createBookRepository } from '../storage/repository'
import { applyBookTemplate } from './book-templates'
import { getProgress } from './progress'
import {
  closeBook, listBookLocations, openBook, registerExternalBook, resolveBookLocation,
  uniqueBookId, unregisterExternalBook, type BookLocation,
} from './workspace'

async function lastModified(root: string): Promise<string | null> {
  try {
    const dirs = [root, join(root, 'manuscript'), join(root, 'notes')]
    const times = await Promise.all(dirs.map(dir => stat(dir).then(s => s.mtimeMs, () => 0)))
    const latest = Math.max(...times)
    return latest ? new Date(latest).toISOString() : null
  }
  catch {
    return null
  }
}

async function summarize(workspaceDir: string, location: BookLocation, config?: BookConfig): Promise<BookSummary> {
  const book = await openBook(workspaceDir, location.id)
  const cfg = config ?? await readBookConfig(location.root)
  const progress = await getProgress(book.db)
  return {
    id: location.id,
    title: cfg.title,
    subtitle: cfg.subtitle ?? null,
    author: cfg.author ?? null,
    language: cfg.language,
    template: cfg.template,
    external: location.external,
    wordCount: progress.totalWords,
    scenes: progress.scenes,
    updatedAt: await lastModified(location.root),
    blockExport: blockExportPolicy(cfg.export.blocks),
    snapshotGit: cfg.snapshots.git,
  }
}

export async function listBooks(workspaceDir: string): Promise<BookSummary[]> {
  const locations = await listBookLocations(workspaceDir)
  const books = await Promise.all(locations.map(location => summarize(workspaceDir, location)))
  return books.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

export async function getBookSummary(workspaceDir: string, bookId: string): Promise<BookSummary> {
  return summarize(workspaceDir, await resolveBookLocation(workspaceDir, bookId))
}

/** Creates a new book folder inside the workspace from a template. */
export async function createBook(workspaceDir: string, input: CreateBookInput): Promise<{ book: BookSummary, firstScenePath: string }> {
  const data = CreateBookSchema.parse(input)
  const id = await uniqueBookId(workspaceDir, slugify(data.title))
  const root = join(workspaceDir, id)
  await mkdir(root, { recursive: true })
  await writeBookConfig(root, { version: 1, title: data.title, author: data.author || undefined, language: data.language, template: data.template, created: new Date().toISOString() })
  const firstScenePath = await applyBookTemplate(createBookRepository(root), data.template, path => mkdir(resolveInBook(root, path), { recursive: true }).then(() => undefined))
  return { book: await getBookSummary(workspaceDir, id), firstScenePath }
}

/**
 * Adds an existing folder (e.g. a git repo of Markdown files) as a book. If it has no `wrote.json`,
 * one is created with the folder name as title; existing files are never modified.
 */
export async function openFolderAsBook(workspaceDir: string, folder: string): Promise<BookSummary> {
  if (!isAbsolute(folder)) throw new InvalidPathError(folder)
  const root = resolve(folder)
  const isDir = await stat(root).then(s => s.isDirectory(), () => false)
  if (!isDir) throw new NotFoundError(`Folder ${folder}`)
  const existing = (await listBookLocations(workspaceDir)).find(location => location.root === root)
  if (existing) return getBookSummary(workspaceDir, existing.id)

  const hasConfig = await access(join(root, 'wrote.json')).then(() => true, () => false)
  if (!hasConfig) {
    await writeBookConfig(root, { version: 1, title: basename(root), template: 'blank', created: new Date().toISOString() })
  }
  const insideWorkspace = resolve(root, '..') === resolve(workspaceDir)
  const id = insideWorkspace ? basename(root) : await uniqueBookId(workspaceDir, slugify(basename(root)))
  if (!insideWorkspace) await registerExternalBook(workspaceDir, root, id)
  return getBookSummary(workspaceDir, id)
}

export async function updateBook(workspaceDir: string, bookId: string, changes: UpdateBookInput): Promise<BookSummary> {
  const location = await resolveBookLocation(workspaceDir, bookId)
  const config = await readBookConfig(location.root)
  const next = await writeBookConfig(location.root, { ...config, ...changes })
  return summarize(workspaceDir, location, next)
}

/**
 * Removes a book from the workspace. External folders are only unregistered; books inside the
 * workspace are moved to `<workspace>/.trash/` – files are never deleted.
 */
export async function removeBook(workspaceDir: string, bookId: string): Promise<void> {
  const location = await resolveBookLocation(workspaceDir, bookId)
  await closeBook(bookId)
  if (location.external) return unregisterExternalBook(workspaceDir, bookId)
  const trash = join(workspaceDir, '.trash')
  await mkdir(trash, { recursive: true })
  await rename(location.root, join(trash, `${bookId}-${Date.now()}`))
}
