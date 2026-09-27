import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

/** Bump when the index schema changes: the index is dropped and rebuilt from the Markdown files. */
export const INDEX_SCHEMA_VERSION = 2

const DDL = [
  `CREATE TABLE entries (
    id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, type TEXT NOT NULL, title TEXT NOT NULL,
    status TEXT, pinned INTEGER NOT NULL DEFAULT 0, word_count INTEGER NOT NULL DEFAULT 0,
    hash TEXT NOT NULL, updated_at TEXT, frontmatter TEXT NOT NULL
  )`,
  'CREATE INDEX entries_type_idx ON entries(type)',
  `CREATE TABLE tags (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE, tag TEXT NOT NULL,
    PRIMARY KEY (entry_id, tag)
  )`,
  'CREATE INDEX tags_tag_idx ON tags(tag)',
  `CREATE TABLE links (
    source_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE, target TEXT NOT NULL, label TEXT
  )`,
  'CREATE INDEX links_target_idx ON links(target)',
  `CREATE TABLE entry_names (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE, name TEXT NOT NULL
  )`,
  'CREATE INDEX entry_names_name_idx ON entry_names(name)',
  `CREATE VIRTUAL TABLE entries_fts USING fts5(id UNINDEXED, title, body, tokenize = 'unicode61 remove_diacritics 2')`,
  `CREATE TABLE chunks (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE, seq INTEGER NOT NULL,
    hash TEXT NOT NULL, text TEXT NOT NULL, PRIMARY KEY (entry_id, seq)
  )`,
  'CREATE INDEX chunks_hash_idx ON chunks(hash)',
  // Vectors are keyed by chunk hash: identical text is embedded once and survives unrelated edits.
  'CREATE TABLE embeddings (hash TEXT PRIMARY KEY, vector BLOB NOT NULL)',
  'CREATE TABLE index_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
]

export type IndexDb = ReturnType<typeof drizzle<typeof schema>> & { $client: Client }

async function currentVersion(client: Client): Promise<number> {
  const result = await client.execute('PRAGMA user_version')
  return Number(result.rows[0]?.[0] ?? 0)
}

async function createSchema(client: Client) {
  await client.batch([...DDL, `PRAGMA user_version = ${INDEX_SCHEMA_VERSION}`], 'write')
}

/**
 * Opens the index for a book (`:memory:` for tests). If the schema version differs,
 * the index is recreated – it only contains data derived from the Markdown files.
 */
export async function openIndexDb(bookRoot: string | ':memory:'): Promise<IndexDb> {
  let url = ':memory:'
  if (bookRoot !== ':memory:') {
    const dir = join(bookRoot, '.wrote')
    await mkdir(dir, { recursive: true })
    url = `file:${join(dir, 'index.db')}`
  }
  let client = createClient({ url })
  const version = await currentVersion(client)
  if (version !== INDEX_SCHEMA_VERSION) {
    if (version !== 0 && bookRoot !== ':memory:') {
      client.close()
      await rm(join(bookRoot, '.wrote', 'index.db'), { force: true })
      client = createClient({ url })
    }
    await createSchema(client)
  }
  await client.execute('PRAGMA foreign_keys = ON')
  return drizzle(client, { schema })
}
