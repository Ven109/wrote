import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BUILT_IN_CODEX_TYPES } from '#shared/schemas/codex'
import { copyFixtureBook } from '../../test/utils/fixture-book'
import { listCodexTypes, saveCustomType, validateFields } from './types'

let root: string
let cleanup: () => Promise<void>

beforeEach(async () => {
  ({ root, cleanup } = await copyFixtureBook())
})
afterEach(() => cleanup())

const character = BUILT_IN_CODEX_TYPES.find(type => type.id === 'character')!

describe('codex types', () => {
  it('lists built-in types by default', async () => {
    const { types, errors } = await listCodexTypes(root)
    expect(types.map(type => type.id)).toEqual(['character', 'place', 'item', 'faction', 'lore', 'event', 'glossary'])
    expect(errors).toEqual([])
  })

  it('loads, saves and validates custom types from codex/_types', async () => {
    await saveCustomType(root, { id: 'creature', label: 'Creature', plural: 'Creatures', icon: 'i-lucide-bug', folder: 'creatures', builtIn: false, fields: [{ key: 'habitat', label: 'Habitat', kind: 'text', required: false }] })
    await writeFile(join(root, 'codex/_types/broken.yaml'), 'label: [unclosed')
    await writeFile(join(root, 'codex/_types/place.yaml'), 'label: Place again')
    const { types, errors } = await listCodexTypes(root)
    expect(types.at(-1)).toMatchObject({ id: 'creature', folder: 'creatures', builtIn: false, fields: [{ key: 'habitat' }] })
    expect(errors.map(error => error.file).sort()).toEqual(['codex/_types/broken.yaml', 'codex/_types/place.yaml'])
  })

  it('derives defaults for minimal custom files', async () => {
    await mkdir(join(root, 'codex/_types'), { recursive: true })
    await writeFile(join(root, 'codex/_types/spell.yaml'), 'label: Spell\nfields:\n  - key: cost\n    label: Cost\n')
    const spell = (await listCodexTypes(root)).types.find(type => type.id === 'spell')!
    expect(spell).toMatchObject({ plural: 'Spell', folder: 'spell', fields: [{ key: 'cost', kind: 'text', required: false }] })
  })
})

describe('validateFields', () => {
  it('accepts matching kinds and clears', () => {
    expect(validateFields(character, { role: 'protagonist', relationships: ['cdx_a'], age: null })).toEqual([])
  })

  it('rejects unknown keys, wrong kinds and invalid choices', () => {
    expect(validateFields(character, { eyes: 'grey', relationships: 'x', role: 'hero' })).toEqual([
      'eyes is not a field of Character',
      'Relationships must be a list',
      'Role must be one of protagonist, antagonist, supporting, minor',
    ])
  })
})
