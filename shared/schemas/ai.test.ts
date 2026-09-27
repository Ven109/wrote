import { describe, expect, it } from 'vitest'
import { UpdateAiSettingsSchema } from './ai'

describe('UpdateAiSettingsSchema', () => {
  it('leaves omitted provider fields undefined (a base URL patch must not disable a provider)', () => {
    expect(UpdateAiSettingsSchema.parse({ providers: { ollama: { baseUrl: 'http://127.0.0.1:1' } } })).toEqual({ providers: { ollama: { baseUrl: 'http://127.0.0.1:1' } } })
  })

  it('rejects malformed model refs and URLs', () => {
    expect(() => UpdateAiSettingsSchema.parse({ models: { chat: 'nope' } })).toThrow()
    expect(() => UpdateAiSettingsSchema.parse({ providers: { ollama: { baseUrl: 'not a url' } } })).toThrow()
  })
})
