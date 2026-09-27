import { cp, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { FIXTURE_BOOK } from './fixture-book'

/** Creates a temp workspace containing a copy of the sample book as `sample-book`. */
export async function createTestWorkspace(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'wrote-ws-'))
  await promisify(cp)(FIXTURE_BOOK, join(dir, 'sample-book'), { recursive: true })
  return dir
}
