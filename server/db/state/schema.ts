import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** State database (`.wrote/state.db`): app state with no file representation. See `migrations.ts`. */
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  input: text('input', { mode: 'json' }).$type<unknown>().notNull(),
  result: text('result', { mode: 'json' }).$type<unknown>(),
  error: text('error'),
  progress: real('progress').notNull().default(0),
  message: text('message'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  runAfter: text('run_after').notNull(),
  createdAt: text('created_at').notNull(),
  startedAt: text('started_at'),
  finishedAt: text('finished_at'),
})

/** Rolling summaries (see `server/services/summaries.ts`). `source_*` record what a generated summary was made from. */
export const summaries = sqliteTable('summaries', {
  entryId: text('entry_id').primaryKey(),
  scope: text('scope').notNull(),
  text: text('text').notNull(),
  sourceText: text('source_text'),
  sourceHash: text('source_hash'),
  isManual: integer('is_manual', { mode: 'boolean' }).notNull().default(false),
  model: text('model'),
  updatedAt: text('updated_at').notNull(),
})

/** Tokens spent per day and feature, for budgets. */
export const aiUsage = sqliteTable('ai_usage', {
  day: text('day').notNull(),
  feature: text('feature').notNull(),
  tokens: integer('tokens').notNull().default(0),
})
