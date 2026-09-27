/**
 * Append-only migrations of `state.db` (primary app state, never dropped).
 * Each entry is applied once, in order; `PRAGMA user_version` stores how many ran.
 * Never edit or reorder an entry that has shipped – add a new one.
 */
export const STATE_MIGRATIONS: string[][] = [
  // 1: background jobs
  [
    `CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      input TEXT NOT NULL DEFAULT 'null',
      result TEXT,
      error TEXT,
      progress REAL NOT NULL DEFAULT 0,
      message TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      run_after TEXT NOT NULL,
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT
    )`,
    'CREATE INDEX jobs_status_run_after_idx ON jobs(status, run_after)',
    'CREATE INDEX jobs_created_at_idx ON jobs(created_at)',
  ],
  // 2: assistant chat threads
  [
    `CREATE TABLE chat_threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE chat_messages (
      thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      id TEXT NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      PRIMARY KEY (thread_id, seq)
    )`,
  ],
  // 3: rolling summaries (WRO-48) and AI token usage per day
  [
    `CREATE TABLE summaries (
      entry_id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      text TEXT NOT NULL,
      source_text TEXT,
      source_hash TEXT,
      is_manual INTEGER NOT NULL DEFAULT 0,
      model TEXT,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE ai_usage (
      day TEXT NOT NULL,
      feature TEXT NOT NULL,
      tokens INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, feature)
    )`,
  ],
]
