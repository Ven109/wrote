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

/** Exactly what was sent with one AI request (see `server/ai/context/`). */
export const aiContextSnapshots = sqliteTable('ai_context_snapshots', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  feature: text('feature').notNull(),
  model: text('model').notNull(),
  budget: integer('budget').notNull(),
  used: integer('used').notNull(),
  items: text('items', { mode: 'json' }).notNull(),
  omitted: text('omitted', { mode: 'json' }).notNull(),
  system: text('system').notNull(),
})

/** AI suggestions; `data` holds the full `Suggestion` (JSON), the columns are for filtering. */
export const suggestions = sqliteTable('suggestions', {
  id: text('id').primaryKey(),
  entryId: text('entry_id').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
})

/** Activity log (WRO-61); `data` holds the full `ActivityEntry` (JSON), the columns are for filtering. */
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  actorKind: text('actor_kind').notNull(),
  tool: text('tool').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
})

/** Codex proposals (WRO-66); `data` holds the full `CodexProposal` (JSON). */
export const codexProposals = sqliteTable('codex_proposals', {
  id: text('id').primaryKey(),
  sourceEntryId: text('source_entry_id').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
})

/** Comments on passages (WRO-67); `data` holds the full `Comment` (JSON). */
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  entryId: text('entry_id').notNull(),
  resolved: integer('resolved').notNull().default(0),
  createdAt: text('created_at').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
})
