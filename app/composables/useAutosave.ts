import type { SaveResult } from '~/stores/document-session'

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'conflict' | 'error'

interface AutosaveTarget {
  draft: Ref<string>
  dirty: Ref<boolean>
  save: (options?: { force?: boolean }) => Promise<SaveResult>
  reload: () => Promise<void>
}

/**
 * Saves `target` `delay` ms after typing stops. Stops on a conflict until the user resolves it
 * (`keepMine` overwrites the disk version, `useTheirs` discards the draft).
 */
export function useAutosave(target: AutosaveTarget, options: { delay?: number } = {}) {
  const status = ref<AutosaveStatus>('idle')
  let running: Promise<void> | null = null

  async function run(force = false) {
    if (!target.dirty.value) return
    status.value = 'saving'
    const result = await target.save({ force })
    if (result === 'conflict' || result === 'error') status.value = result
    else status.value = target.dirty.value ? 'pending' : 'saved'
    if (status.value === 'pending') schedule()
  }

  /** Saves now (waiting for a save already in flight). No-op while a conflict is unresolved. */
  async function flush() {
    if (running) await running
    if (status.value === 'conflict') return
    running = run().finally(() => {
      running = null
    })
    await running
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), options.delay ?? 1000)
  }
  onScopeDispose(() => clearTimeout(timer))

  watch(target.draft, () => {
    if (!target.dirty.value || status.value === 'conflict') return
    status.value = 'pending'
    schedule()
  })

  async function keepMine() {
    status.value = 'pending'
    await run(true)
  }

  async function useTheirs() {
    await target.reload()
    status.value = 'saved'
  }

  return { status, flush, keepMine, useTheirs }
}
