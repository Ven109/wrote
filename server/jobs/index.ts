import type { WroteJob } from './define'
import { embedJob } from './embed'
import { reindexJob } from './reindex'
import { sleepJob } from './sleep'

/** All background job kinds (`sleep` only for tests: `WROTE_TEST_JOBS=1`). */
export const WROTE_JOBS: WroteJob[] = [reindexJob, embedJob, ...(process.env.WROTE_TEST_JOBS === '1' ? [sleepJob] : [])]
