import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import type { TriageSuggestions } from '#shared/schemas/triage'
import { useNoteTriage } from './useNoteTriage'

const suggestions: TriageSuggestions = {
  tags: ['plot'],
  links: [{ id: 'cdx_1', title: 'Mara Velden', type: 'codex', reason: 'mentioned' }],
  chapter: { id: 'chp_1', title: 'The Harbor', path: 'manuscript/x/index.md' },
}
registerEndpoint('/api/books/triage-book/notes/triage', () => suggestions)

function fakeNote() {
  const tags = ref<string[]>([])
  return {
    entry: { document: ref({ path: 'notes/inbox/idea.md' }), draft: ref('An idea.\n') },
    inInbox: computed(() => true),
    tags: computed(() => tags.value),
    setTags: vi.fn(async (next: string[]) => {
      tags.value = next
    }),
    file: vi.fn(async () => {}),
  }
}

describe('useNoteTriage', () => {
  it('applies tags, links and the chapter like the author would, and hides dismissed chips', async () => {
    const note = fakeNote()
    let triage!: ReturnType<typeof useNoteTriage>
    await mountSuspended(defineComponent({
      setup() {
        triage = useNoteTriage('triage-book', note as unknown as Parameters<typeof useNoteTriage>[1])
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(triage.chips.value.map(c => c.key)).toEqual(['tag:plot', 'link:cdx_1', 'chapter:chp_1']))
    const [tag, link, chapter] = triage.chips.value
    await triage.accept(tag!)
    expect(note.setTags).toHaveBeenCalledWith(['plot'])
    await triage.accept(link!)
    expect(note.entry.draft.value).toBe('An idea.\n\n[[Mara Velden]]\n')
    triage.dismiss(chapter!)
    expect(triage.chips.value).toEqual([])
    expect(note.file).not.toHaveBeenCalled()
  })
})
