import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { migrate, openStateDb } from './client'

describe('state.db migrations', () => {
  it('applies migrations once and keeps data across reopen', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wrote-state-'))
    const db = await openStateDb(root)
    await db.$client.execute(`INSERT INTO jobs (id, kind, status, run_after, created_at) VALUES ('j1', 'x', 'queued', '0', '0')`)
    db.$client.close()
    const reopened = await openStateDb(root)
    const rows = await reopened.$client.execute('SELECT id FROM jobs')
    expect(rows.rows.map(row => row.id)).toEqual(['j1'])
    reopened.$client.close()
  })

  it('runs only new migrations and refuses newer databases', async () => {
    const client = createClient({ url: ':memory:' })
    await migrate(client, [['CREATE TABLE a (x)']])
    expect(await migrate(client, [['CREATE TABLE a (x)'], ['CREATE TABLE b (y)']])).toBe(2)
    await expect(migrate(client, [['CREATE TABLE a (x)']])).rejects.toThrow(/newer/)
  })
})
