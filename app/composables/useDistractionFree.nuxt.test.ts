import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, effectScope, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWritingModesStore } from '~/stores/writing-modes'
import { exitsOnEscape, useDistractionFree } from './useDistractionFree'

let scope: ReturnType<typeof effectScope>
beforeEach(() => {
  useWritingModesStore().distractionFree = false
  scope = effectScope()
})
afterEach(() => {
  scope.stop()
  vi.restoreAllMocks()
})

const run = () => scope.run(() => useDistractionFree())!
const escape = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))

describe('exitsOnEscape', () => {
  const root = (html: string) => Object.assign(document.createElement('div'), { innerHTML: html })

  it.each([
    ['a plain Esc', { key: 'Escape', isComposing: false }, '<p>Text</p>', true],
    ['another key', { key: 'Enter', isComposing: false }, '<p>Text</p>', false],
    ['Esc while composing', { key: 'Escape', isComposing: true }, '<p>Text</p>', false],
    ['Esc with a dialog open', { key: 'Escape', isComposing: false }, '<div role="dialog"></div>', false],
    ['Esc with a suggestion list open', { key: 'Escape', isComposing: false }, '<div role="listbox"></div>', false],
    ['Esc with a ghost completion shown', { key: 'Escape', isComposing: false }, '<div class="ProseMirror"><span class="ghost-text"></span></div>', false],
  ])('%s', (_name, event, html, expected) => {
    expect(exitsOnEscape(event, root(html))).toBe(expected)
  })
})

describe('useDistractionFree', () => {
  it('enters the mode and asks the browser for full screen once mounted', async () => {
    const request = vi.fn(() => Promise.resolve())
    Object.assign(document.documentElement, { requestFullscreen: request })
    Object.assign(document, { exitFullscreen: vi.fn(() => Promise.resolve()), webkitIsFullScreen: false })
    let df!: ReturnType<typeof useDistractionFree>
    const wrapper = await mountSuspended(defineComponent({
      setup() {
        df = useDistractionFree()
        return () => h('div')
      },
    }))
    await df.enter()
    expect(df.distractionFree.value).toBe(true)
    expect(request).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('still enters the mode when full screen is refused', async () => {
    Object.assign(document.documentElement, { requestFullscreen: vi.fn(() => Promise.reject(new Error('denied'))) })
    const df = run()
    await df.toggle()
    expect(df.distractionFree.value).toBe(true)
  })

  it('exits on Esc, but not when Esc closes a dialog', async () => {
    const df = run()
    await df.enter()
    const dialog = document.body.appendChild(document.createElement('div'))
    dialog.setAttribute('role', 'dialog')
    escape()
    expect(df.distractionFree.value).toBe(true)
    dialog.remove()
    escape()
    expect(df.distractionFree.value).toBe(false)
  })

  it('toggles off again', async () => {
    const df = run()
    await df.toggle()
    await df.toggle()
    expect(df.distractionFree.value).toBe(false)
  })
})
