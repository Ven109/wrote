import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FIXTURE_BOOK } from './fixture-book'

const created: string[] = []

/** A temp directory removed after the test file (like the workspaces below). */
export async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  created.push(dir)
  return dir
}

/** Creates a temp workspace containing a copy of the sample book as `sample-book` (removed after the test file). */
export async function createTestWorkspace(): Promise<string> {
  const dir = await createTempDir('wrote-ws-')
  await cp(FIXTURE_BOOK, join(dir, 'sample-book'), { recursive: true })
  return dir
}

/** Removes the temp directories and workspaces this test file created (registered in `test/setup/cleanup.ts`). */
export async function removeTestWorkspaces(): Promise<void> {
  await Promise.all(created.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
}
