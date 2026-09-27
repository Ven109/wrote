import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { readBody } from 'h3'
import { useQuickCapture } from './useQuickCapture'

const captured: string[] = []
registerEndpoint('/api/books', () => [{ id: 'qc', title: 'QC' }])
registerEndpoint('/api/books/qc/notes', {
  method: 'POST',
  async handler(event) {
    captured.push((await readBody<{ text: string }>(event)).text)
    return { id: 'nte_x00000001', path: 'notes/inbox/x.md' }
  },
})

async function mountCapture() {
  let api!: ReturnType<typeof useQuickCapture>
  await mountSuspended(defineComponent({
    setup() {
      api = useQuickCapture()
      return () => h('div')
    },
  }))
  await vi.waitFor(() => expect(api.targetTitle.value).toBe('QC'))
  return api
}

describe('useQuickCapture', () => {
  it('saves on Enter into the first book and closes', async () => {
    const api = await mountCapture()
    api.show()
    api.text.value = 'An idea'
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    api.onKeydown(enter)
    await vi.waitFor(() => expect(captured).toEqual(['An idea']))
    await vi.waitFor(() => expect(api.open.value).toBe(false))
    expect(api.text.value).toBe('')
    expect(enter.defaultPrevented).toBe(true)
  })

  it('keeps Shift+Enter as a newline and ignores empty text', async () => {
    const api = await mountCapture()
    const shiftEnter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true })
    api.onKeydown(shiftEnter)
    expect(shiftEnter.defaultPrevented).toBe(false)
    api.text.value = '   '
    await api.submit()
    expect(captured).toHaveLength(1)
  })
})
