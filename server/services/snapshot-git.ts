import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** Whether the book folder is inside a git work tree. */
export async function isGitRepo(root: string): Promise<boolean> {
  return run('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], { timeout: 10_000 }).then(result => result.stdout.trim() === 'true', () => false)
}

/**
 * Commits the snapshotted files with the snapshot name as message. Only these paths are committed (other
 * staged work stays staged). Returns the commit hash, or `null` when there was nothing to commit.
 */
export async function commitSnapshot(root: string, paths: string[], message: string): Promise<string | null> {
  if (!paths.length || !await isGitRepo(root)) return null
  const git = (args: string[]) => run('git', ['-C', root, ...args], { timeout: 30_000 })
  await git(['add', '-A', '--', ...paths])
  const staged = await git(['diff', '--cached', '--name-only', '--', ...paths])
  if (!staged.stdout.trim()) return null
  await git(['commit', '-m', message, '--', ...paths])
  return (await git(['rev-parse', 'HEAD'])).stdout.trim()
}
