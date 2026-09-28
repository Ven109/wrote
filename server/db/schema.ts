import { blob, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Index database (`.wrote/index.db`). Everything here is derived from the book's Markdown files
 * and can be rebuilt at any time – see `INDEX_SCHEMA_VERSION`.
 */
export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  path: text('path').notNull().unique(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  status: text('status'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  wordCount: integer('word_count').notNull().default(0),
  hash: text('hash').notNull(),
  updatedAt: text('updated_at'),
  frontmatter: text('frontmatter', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
}, table => [index('entries_type_idx').on(table.type)])

export const tags = sqliteTable('tags', {
  entryId: text('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
}, table => [primaryKey({ columns: [table.entryId, table.tag] }), index('tags_tag_idx').on(table.tag)])

/** Link targets are stored as written (lower-cased); resolution against ids/titles/aliases happens at query time. */
export const links = sqliteTable('links', {
  sourceId: text('source_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  target: text('target').notNull(),
  label: text('label'),
}, table => [index('links_target_idx').on(table.target)])

/** Lower-cased names an entry can be linked by: title, id and aliases. */
export const entryNames = sqliteTable('entry_names', {
  entryId: text('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
}, table => [index('entry_names_name_idx').on(table.name)])

/** Embedding-sized pieces of each entry (see `server/search/chunk.ts`). */
export const chunks = sqliteTable('chunks', {
  entryId: text('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  hash: text('hash').notNull(),
  text: text('text').notNull(),
}, table => [primaryKey({ columns: [table.entryId, table.seq] }), index('chunks_hash_idx').on(table.hash)])

/** Float32 vectors per chunk hash, written by the background `embed` job (libSQL vector functions). */
export const embeddings = sqliteTable('embeddings', {
  hash: text('hash').primaryKey(),
  vector: blob('vector').notNull(),
})

/** Key/value facts about the index, e.g. which embedding model produced the vectors. */
export const indexMeta = sqliteTable('index_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

/** Outline beats, derived from outline.md (WRO-9). */
export const beats = sqliteTable('beats', {
  id: text('id').primaryKey(),
  entryId: text('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  actId: text('act_id').notNull(),
  actTitle: text('act_title').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  position: integer('position').notNull(),
})

export const beatScenes = sqliteTable('beat_scenes', {
  beatId: text('beat_id').notNull().references(() => beats.id, { onDelete: 'cascade' }),
  sceneId: text('scene_id').notNull(),
  position: integer('position').notNull(),
}, table => [index('beat_scenes_scene_idx').on(table.sceneId)])
