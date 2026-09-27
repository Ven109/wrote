import type { WroteJob } from './define'
import { embedJob } from './embed'
import { extractCodexJob } from './extract-codex'
import { reindexJob } from './reindex'
import { summarizeJob } from './summarize'
import { sleepJob } from './sleep'

/** All background job kinds (`sleep` only for tests: `WROTE_TEST_JOBS=1`). */
export const WROTE_JOBS: WroteJob[] = [reindexJob, embedJob, summarizeJob, extractCodexJob, ...(process.env.WROTE_TEST_JOBS === '1' ? [sleepJob] : [])]
