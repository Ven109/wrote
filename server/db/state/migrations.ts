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
]
