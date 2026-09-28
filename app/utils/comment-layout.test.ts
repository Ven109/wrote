import { describe, expect, it } from 'vitest'
import { stackCards } from './comment-layout'

describe('stackCards', () => {
  it('puts cards level with their passages and pushes overlapping ones down', () => {
    expect(stackCards([{ id: 'b', top: 40 }, { id: 'a', top: 0 }, { id: 'c', top: 500 }], { a: 80, b: 60 })).toEqual({ a: 0, b: 88, c: 500 })
  })
})
