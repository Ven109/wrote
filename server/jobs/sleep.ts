import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'
import { defineWroteJob } from './define'

/** Diagnostic job that waits in steps and reports progress. Registered only with `WROTE_TEST_JOBS=1`. */
export const sleepJob = defineWroteJob({
  kind: 'sleep',
  title: 'Sleep (test)',
  input: z.object({ steps: z.number().int().min(1).max(1000).default(10), stepMs: z.number().int().min(0).max(10_000).default(100) }).default({ steps: 10, stepMs: 100 }),
  maxAttempts: 1,
  async run({ input, signal, progress }) {
    for (let step = 1; step <= input.steps; step++) {
      await delay(input.stepMs, undefined, { signal })
      await progress(step / input.steps, `Step ${step} of ${input.steps}`)
    }
    return { steps: input.steps }
  },
})
