import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { getQuery, readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { SnapshotSummary } from '#shared/schemas/snapshot'
import { useSnapshotDiff } from './useSnapshotDiff'
import { useSnapshots } from './useSnapshots'

const snapshot = (id: string): SnapshotSummary => ({ id, createdAt: '2026-09-28T10:00:00Z', name: id, auto: false, scope: { kind: 'book', entryId: null, title: 'Whole book' }, actor: { kind: 'user', name: 'You' }, words: 10, commit: null, fileCount: 3 })
const created: unknown[] = []
const restores: unknown[] = []
const listQueries: unknown[] = []
registerEndpoint('/api/books/snap-book/structure', () => [{ id: 'prt_1', type: 'part', title: 'One', path: 'manuscript/01-one/index.md', wordCount: 0, children: [
  { id: 'chp_1', type: 'chapter', title: 'Harbor', path: 'manuscript/01-one/01-harbor/index.md', wordCount: 0, children: [
    { id: 'scn_1', type: 'scene', title: 'Arrival', path: 'manuscript/01-one/01-harbor/01-arrival.md', wordCount: 0, children: [] },
  ] },
] }])
registerEndpoint('/api/books/snap-book/snapshots', { method: 'GET', handler: (event) => {
  listQueries.push(getQuery(event))
  return [snapshot('snap_a')]
} })
registerEndpoint('/api/books/snap-book/snapshots', { method: 'POST', handler: async (event) => {
  created.push(await readBody(event))
  return snapshot('snap_new')
} })
registerEndpoint('/api/books/snap-book/snapshots/snap_new/diff', () => [])
registerEndpoint('/api/books/snap-book/snapshots/snap_a/diff', () => [{ path: 'a.md', before: 'A\n\nB\n', after: 'A\n\nB2\n', currentHash: 'h1' }])
registerEndpoint('/api/books/snap-book/snapshots/snap_a/restore', { method: 'POST', handler: async (event) => {
  restores.push(await readBody(event))
  return { restored: ['a.md'], activity: { id: 'act_1' }, safety: null }
} })

async function mount(path: string) {
  let snapshots!: ReturnType<typeof useSnapshots>
  let diff!: ReturnType<typeof useSnapshotDiff>
  await mountSuspended(defineComponent({
    setup() {
      snapshots = useSnapshots('snap-book', path)
      diff = useSnapshotDiff('snap-book', snapshots.selectedId)
      return () => h('div')
    },
  }))
  await vi.waitFor(() => expect(snapshots.snapshots.value).toHaveLength(1))
  return { snapshots, diff }
}

describe('useSnapshots', () => {
  it('offers the scene, its chapter and the whole book as scopes and takes a snapshot', async () => {
    const { snapshots } = await mount('manuscript/01-one/01-harbor/01-arrival.md')
    expect(listQueries.at(-1)).toEqual({ path: 'manuscript/01-one/01-harbor/01-arrival.md' })
    await vi.waitFor(() => expect(snapshots.scopes.value.map(s => s.label)).toEqual(['Scene: Arrival', 'Chapter: Harbor', 'Whole book']))
    await snapshots.take('Before revision', 'chp_1')
    expect(created.at(-1)).toEqual({ name: 'Before revision', entryId: 'chp_1' })
    expect(snapshots.selectedId.value).toBe('snap_new')
  })
})

describe('useSnapshotDiff', () => {
  it('shows block diffs and restores single blocks against the compared version', async () => {
    const { snapshots, diff } = await mount('')
    snapshots.selectedId.value = 'snap_a'
    await vi.waitFor(() => expect(diff.files.value).toHaveLength(1))
    expect(diff.files.value[0]!.blocks.map(b => b.kind)).toEqual(['same', 'changed'])
    await diff.restoreBlock(diff.files.value[0]!, 1)
    expect(restores.at(-1)).toEqual({ path: 'a.md', blocks: [1], expectedHash: 'h1' })
    await diff.restoreAll()
    expect(restores.at(-1)).toEqual({})
  })
})
