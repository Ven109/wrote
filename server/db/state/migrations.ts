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
  // 4: the exact context sent with each AI request (context drawer, WRO-52)
  [
    `CREATE TABLE ai_context_snapshots (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      feature TEXT NOT NULL,
      model TEXT NOT NULL,
      budget INTEGER NOT NULL,
      used INTEGER NOT NULL,
      items TEXT NOT NULL,
      omitted TEXT NOT NULL,
      system TEXT NOT NULL
    )`,
    'CREATE INDEX ai_context_snapshots_created_idx ON ai_context_snapshots(created_at)',
  ],
  // 5: AI suggestions (tracked changes, WRO-54) – previously JSON files in .wrote/suggestions/
  [
    `CREATE TABLE suggestions (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    )`,
    'CREATE INDEX suggestions_entry_status_idx ON suggestions(entry_id, status)',
  ],
  // 6: activity log of AI/MCP tool calls that change data, with before/after file states for undo (WRO-61)
  [
    `CREATE TABLE activity_log (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      actor_kind TEXT NOT NULL,
      tool TEXT NOT NULL,
      data TEXT NOT NULL
    )`,
    'CREATE INDEX activity_log_created_idx ON activity_log(created_at)',
  ],
  // 7: codex proposals from "Scan chapter" (WRO-66)
  [
    `CREATE TABLE codex_proposals (
      id TEXT PRIMARY KEY,
      source_entry_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    )`,
    'CREATE INDEX codex_proposals_status_idx ON codex_proposals(status, source_entry_id)',
  ],
  // 8: comments on passages (WRO-67)
  [
    `CREATE TABLE comments (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    )`,
    'CREATE INDEX comments_entry_idx ON comments(entry_id, resolved)',
  ],
  // 9: outline proposals – ghost beats and notes for the author to accept or reject (WRO-117)
  [
    `CREATE TABLE outline_proposals (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    )`,
    'CREATE INDEX outline_proposals_status_idx ON outline_proposals(status)',
  ],
  // 10: review agent runs (WRO-12); findings are comments with `review` metadata
  [
    `CREATE TABLE review_runs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    )`,
    'CREATE INDEX review_runs_created_idx ON review_runs(created_at)',
  ],
  // 11: snapshots (WRO-4); file contents live in .wrote/snapshots/objects
  [
    `CREATE TABLE snapshots (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    )`,
    'CREATE INDEX snapshots_created_idx ON snapshots(created_at)',
  ],
]
