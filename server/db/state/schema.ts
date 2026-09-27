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
