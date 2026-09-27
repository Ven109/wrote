import { describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import type { SaveResult } from './useEntryDocument'
import { useAutosave } from './useAutosave'

function target(results: SaveResult[] = []) {
  const draft = ref('a')
  const saved = ref('a')
  const dirty = computed(() => draft.value !== saved.value)
  const save = vi.fn(async (options?: { force?: boolean }) => {
    const result = results.shift() ?? 'saved'
    if (result === 'saved' || options?.force) saved.value = draft.value
    return options?.force ? 'saved' : result
  })
  const reload = vi.fn(async () => {
    draft.value = 'disk'
    saved.value = 'disk'
  })
  return { draft, dirty, save, reload }
}

describe('useAutosave', () => {
  it('debounces typing into one save', async () => {
    vi.useFakeTimers()
    const t = target()
    const { status } = useAutosave(t, { delay: 1000 })
    t.draft.value = 'ab'
    await nextTick()
    t.draft.value = 'abc'
    await nextTick()
    expect(status.value).toBe('pending')
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.save).toHaveBeenCalledTimes(1)
    expect(status.value).toBe('saved')
    vi.useRealTimers()
  })

  it('flushes immediately and stops on conflicts until resolved', async () => {
    const t = target(['conflict'])
    const autosave = useAutosave(t, { delay: 60_000 })
    t.draft.value = 'mine'
    await autosave.flush()
    expect(autosave.status.value).toBe('conflict')
    t.draft.value = 'mine!'
    await autosave.flush()
    expect(t.save).toHaveBeenCalledTimes(1)
    await autosave.keepMine()
    expect(t.save).toHaveBeenLastCalledWith({ force: true })
    expect(autosave.status.value).toBe('saved')
  })

  it('discards the draft with useTheirs', async () => {
    const t = target(['conflict'])
    const autosave = useAutosave(t)
    t.draft.value = 'mine'
    await autosave.flush()
    await autosave.useTheirs()
    expect(t.draft.value).toBe('disk')
    expect(autosave.status.value).toBe('saved')
  })
})

describe('useAutosave dispose', () => {
  it('cancels a pending debounced save when its scope is disposed', async () => {
    vi.useFakeTimers()
    const t = target()
    const scope = effectScope()
    scope.run(() => useAutosave(t, { delay: 1000 }))
    t.draft.value = 'changed'
    await nextTick()
    scope.stop()
    await vi.advanceTimersByTimeAsync(2000)
    expect(t.save).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
