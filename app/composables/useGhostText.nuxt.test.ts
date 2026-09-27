import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { ghostTextKey } from '~/editor/extensions/ghost-text'
import { createHeadlessEditor } from '../../test/utils/headless-editor'
import { useGhostText } from './useGhostText'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

async function mountGhost(enabled: boolean) {
  editor = createHeadlessEditor('The tide was out when Mara')
  const complete = vi.fn(async (_before: string, _signal: AbortSignal) => ' reached the bay.')
  await mountSuspended(defineComponent({
    setup() {
      useGhostText(editor, { enabled: ref(enabled), complete }, 10)
      return () => h('div')
    },
  }))
  editor.commands.setTextSelection(editor.state.doc.content.size - 1)
  return complete
}

describe('useGhostText', () => {
  it('asks for a completion after a pause and shows it', async () => {
    const complete = await mountGhost(true)
    editor.commands.insertContent(' finally')
    await vi.waitFor(() => expect(ghostTextKey.getState(editor.state)?.text).toBe(' reached the bay.'))
    expect(complete).toHaveBeenCalledTimes(1)
    expect(complete.mock.calls[0]![0]).toBe('The tide was out when Mara finally')
  })

  it('makes no requests when autocomplete is off', async () => {
    const complete = await mountGhost(false)
    editor.commands.insertContent(' finally')
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(complete).not.toHaveBeenCalled()
  })
})
