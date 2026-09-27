import { cp, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FIXTURE_BOOK } from './fixture-book'

/** Creates a temp workspace containing a copy of the sample book as `sample-book`. */
export async function createTestWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'wrote-ws-'))
  await cp(FIXTURE_BOOK, join(dir, 'sample-book'), { recursive: true })
  return dir
}
