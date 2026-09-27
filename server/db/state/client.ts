import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { STATE_MIGRATIONS } from './migrations'
import * as schema from './schema'

export type StateDb = ReturnType<typeof drizzle<typeof schema>> & { $client: Client }

async function userVersion(client: Client): Promise<number> {
  const result = await client.execute('PRAGMA user_version')
  return Number(result.rows[0]?.[0] ?? 0)
}

/** Applies pending migrations in order, each atomically together with its version bump. */
export async function migrate(client: Client, migrations: string[][] = STATE_MIGRATIONS): Promise<number> {
  const current = await userVersion(client)
  if (current > migrations.length) throw new Error(`state.db is newer (v${current}) than this app (v${migrations.length})`)
  for (let version = current; version < migrations.length; version++) {
    await client.batch([...migrations[version]!, `PRAGMA user_version = ${version + 1}`], 'write')
  }
  return migrations.length
}

/** Opens (and migrates) the state database of a book (`:memory:` for tests). */
export async function openStateDb(bookRoot: string | ':memory:'): Promise<StateDb> {
  let url = ':memory:'
  if (bookRoot !== ':memory:') {
    const dir = join(bookRoot, '.wrote')
    await mkdir(dir, { recursive: true })
    url = `file:${join(dir, 'state.db')}`
  }
  const client = createClient({ url })
  await client.execute('PRAGMA journal_mode = WAL')
  await client.execute('PRAGMA foreign_keys = ON')
  await migrate(client)
  return drizzle(client, { schema })
}
