import { describe, expect, it } from 'vitest'
import { EntryIdSchema } from '../schemas/entry'
import { createId } from './ids'

describe('createId', () => {
  it('creates prefixed ids that match the id schema', () => {
    const id = createId('scene')
    expect(id).toMatch(/^scn_[a-z0-9]{10}$/)
    expect(EntryIdSchema.safeParse(id).success).toBe(true)
  })

  it('creates unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId('note')))
    expect(ids.size).toBe(1000)
  })
})
