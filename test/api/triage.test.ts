import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { TriageSuggestions } from '#shared/schemas/triage'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setup({ server: true, nuxtConfig: { runtimeConfig: { workspaceDir: workspace } } })

describe('inbox triage API', () => {
  it('returns tags, links and a chapter for a note, and rejects other entries', async () => {
    const triage = await $fetch<TriageSuggestions>('/api/books/sample-book/notes/triage', { query: { path: 'notes/inbox/idea-lighthouse.md' } })
    expect(triage).toEqual({ tags: expect.any(Array), links: expect.any(Array), chapter: expect.toBeOneOf([null, expect.objectContaining({ id: expect.stringMatching(/^chp_/) })]) })
    expect((await fetch('/api/books/sample-book/notes/triage?path=codex/characters/mara-velden.md')).status).toBe(400)
    expect((await fetch('/api/books/sample-book/notes/triage?path=notes/missing.md')).status).toBe(404)
  })
})
