import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const FIXTURE_BOOK = join(import.meta.dirname, '..', 'fixtures', 'sample-book')

/** Copies the sample book into a fresh temp dir. Call `cleanup` in `afterEach`. */
export async function copyFixtureBook(): Promise<{ root: string, cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), 'wrote-book-'))
  const root = join(dir, 'sample-book')
  await cp(FIXTURE_BOOK, root, { recursive: true })
  return { root, cleanup: () => rm(dir, { recursive: true, force: true }) }
}
