import { describe, expect, it } from 'vitest'
import { DEFAULT_WRITING_MODE_PREFS, parseWritingModePrefs } from './writing-modes'

describe('parseWritingModePrefs', () => {
  it('returns the defaults for missing or malformed values', () => {
    expect(parseWritingModePrefs(undefined)).toEqual(DEFAULT_WRITING_MODE_PREFS)
    expect(parseWritingModePrefs('nonsense')).toEqual(DEFAULT_WRITING_MODE_PREFS)
  })

  it('keeps valid fields and defaults invalid ones', () => {
    expect(parseWritingModePrefs({ focus: true, focusScope: 'word', typewriter: 'yes', timer: true }))
      .toEqual({ focus: true, focusScope: 'paragraph', typewriter: false, timer: true })
  })
})
