import { describe, expect, it } from 'vitest'
import { parseMcpArgs } from './args'

describe('parseMcpArgs', () => {
  it('uses the parent of --book as workspace and its folder name as book id', () => {
    expect(parseMcpArgs(['mcp', '--book', '/home/me/Wrote/my-novel'], {}, '/home/me')).toEqual({ workspaceDir: '/home/me/Wrote', bookId: 'my-novel' })
  })

  it('defaults the workspace from flags, env or ~/Wrote', () => {
    expect(parseMcpArgs(['mcp', '--workspace', '/books'], {}, '/h')).toEqual({ workspaceDir: '/books' })
    expect(parseMcpArgs(['mcp'], { WROTE_WORKSPACE: '/env' }, '/h')).toEqual({ workspaceDir: '/env' })
    expect(parseMcpArgs(['mcp'], {}, '/h')).toEqual({ workspaceDir: '/h/Wrote' })
  })

  it('prints usage for unknown commands and flags', () => {
    expect(parseMcpArgs([], {}, '/h')).toHaveProperty('error')
    expect(parseMcpArgs(['mcp', '--nope'], {}, '/h')).toHaveProperty('error')
    expect(parseMcpArgs(['mcp', '--book'], {}, '/h')).toHaveProperty('error')
  })
})
