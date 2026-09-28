import { execFile } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { EXPORT_FORMATS } from '#shared/schemas/export'
import { createTestWorkspace } from '../../test/utils/workspace'
import { exportBook } from '../services/export'
import { closeAllBooks, openBook, type BookContext } from '../services/workspace'

/**
 * Export check (`pnpm export:check`, CI job "Export check"): exports the sample book to every format with
 * the real tools and validates the EPUB with epubcheck (`EPUBCHECK_JAR`). Skipped in the normal test run.
 */
const enabled = process.env.WROTE_EXPORT_CHECK === '1'
const run = promisify(execFile)
let book: BookContext
let out: string

describe.runIf(enabled)('export check (sample book)', () => {
  beforeAll(async () => {
    book = await openBook(await createTestWorkspace(), 'sample-book')
    out = await mkdtemp(join(tmpdir(), 'wrote-export-check-'))
  })
  afterAll(() => closeAllBooks())

  it.each(EXPORT_FORMATS)('exports %s', { timeout: 120_000 }, async (format) => {
    const file = await exportBook(book, { format, frontMatter: true })
    expect(file.data.length).toBeGreaterThan(100)
    await writeFile(join(out, file.filename), file.data)
  })

  it('produces an EPUB that passes epubcheck', { timeout: 120_000 }, async () => {
    const jar = process.env.EPUBCHECK_JAR
    if (!jar) throw new Error('Set EPUBCHECK_JAR to the epubcheck.jar path')
    const file = await exportBook(book, { format: 'epub', frontMatter: true })
    const path = join(out, 'check.epub')
    await writeFile(path, file.data)
    const result = await run('java', ['-jar', jar, path]).catch((error: { stdout?: string, stderr?: string }) => {
      throw new Error(`epubcheck failed:\n${error.stdout ?? ''}\n${error.stderr ?? ''}`)
    })
    expect(result.stdout).toContain('No errors or warnings detected')
  })
})
