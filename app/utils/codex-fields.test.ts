import { describe, expect, it } from 'vitest'
import { BUILT_IN_CODEX_TYPES } from '#shared/schemas/codex'
import { cloneForm, fieldFormFrom, fieldPatch } from './codex-fields'

const character = BUILT_IN_CODEX_TYPES.find(type => type.id === 'character')!

describe('codex field form', () => {
  it('builds the form from frontmatter, ignoring non-template keys', () => {
    const form = fieldFormFrom(character, { role: 'protagonist', relationships: 'cdx_a', eyes: 'grey', aliases: ['M'] })
    expect(form.fields).toMatchObject({ role: 'protagonist', relationships: ['cdx_a'], age: '' })
    expect(form.fields).not.toHaveProperty('eyes')
    expect(form.aliases).toEqual(['M'])
  })

  it('patches only changed keys and clears emptied ones', () => {
    const before = fieldFormFrom(character, { role: 'protagonist', age: '30' })
    const after = { fields: { ...before.fields, age: ' ', goals: 'Find the map ' }, aliases: ['Mar'] }
    expect(fieldPatch(character, before, after)).toEqual({ fields: { age: null, goals: 'Find the map' }, aliases: ['Mar'] })
    expect(fieldPatch(character, before, structuredClone(before))).toBeNull()
  })

  it('clones forms deeply, including reactive proxies', () => {
    // Vue reactive state is a Proxy; structuredClone throws on proxies.
    const plain = fieldFormFrom(character, { relationships: ['a'] })
    const form = new Proxy(plain, {})
    expect(() => structuredClone(form)).toThrow()
    const copy = cloneForm(form)
    copy.fields.relationships = [...(copy.fields.relationships as string[]), 'b']
    expect(form.fields.relationships).toEqual(['a'])
  })
})
