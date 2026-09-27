import { chmod, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { z } from 'zod'
import { writeFileAtomic } from './fs'

/** Workspace-level settings files live next to the book registry in `<workspace>/.wrote/`. */
export const settingsPath = (workspaceDir: string, name: string) => join(workspaceDir, '.wrote', name)

/** Reads a JSON settings file, falling back to the schema's defaults when it is missing. */
export async function readSettingsFile<S extends z.ZodType>(workspaceDir: string, name: string, schema: S): Promise<z.infer<S>> {
  let raw: unknown = {}
  try {
    raw = JSON.parse(await readFile(settingsPath(workspaceDir, name), 'utf8'))
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return schema.parse(raw)
}

/** Writes a JSON settings file atomically. `secret` files are readable by the owner only (0600). */
export async function writeSettingsFile(workspaceDir: string, name: string, data: unknown, options: { secret?: boolean } = {}): Promise<void> {
  const path = settingsPath(workspaceDir, name)
  await writeFileAtomic(path, `${JSON.stringify(data, null, 2)}\n`, { mode: options.secret ? 0o600 : undefined })
  if (options.secret) await chmod(path, 0o600)
}
