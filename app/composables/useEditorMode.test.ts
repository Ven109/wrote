import { describe, expect, it } from 'vitest'
import { resolveEditorMode } from './useEditorMode'
import { keyboardInset } from './useKeyboardInset'

describe('resolveEditorMode', () => {
  it('uses blocks only on large screens with a fine pointer', () => {
    expect(resolveEditorMode('auto', true, false)).toBe('block')
    expect(resolveEditorMode('auto', true, true)).toBe('document')
    expect(resolveEditorMode('auto', false, false)).toBe('document')
  })

  it('honours an explicit preference', () => {
    expect(resolveEditorMode('block', false, true)).toBe('block')
    expect(resolveEditorMode('document', true, false)).toBe('document')
  })
})

describe('keyboardInset', () => {
  it('is the part of the layout viewport covered by the keyboard', () => {
    expect(keyboardInset(800, { height: 500, offsetTop: 0 })).toBe(300)
    expect(keyboardInset(800, { height: 500, offsetTop: 300 })).toBe(0)
    expect(keyboardInset(800, { height: 800, offsetTop: 0 })).toBe(0)
  })
})
