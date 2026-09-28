import { describe, expect, it } from 'vitest'
import { parseCliArgs, parseMcpArgs, parseServeArgs } from './args'

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

describe('parseServeArgs', () => {
  it('defaults to the current folder on localhost, opening the browser', () => {
    expect(parseServeArgs([], '/work')).toEqual({ folder: '/work', host: '127.0.0.1', open: true })
  })

  it('resolves a relative folder and reads flags in any order', () => {
    expect(parseServeArgs(['--no-open', './my-book', '--port', '4000', '--host', '0.0.0.0'], '/work'))
      .toEqual({ folder: '/work/my-book', port: 4000, host: '0.0.0.0', open: false })
  })

  it.each([
    [['--port', 'abc']],
    [['--port', '70000']],
    [['--port']],
    [['a', 'b']],
    [['--nope']],
  ])('rejects %j', (argv) => {
    expect(parseServeArgs(argv, '/work')).toHaveProperty('error')
  })
})

describe('parseCliArgs', () => {
  it('dispatches to the launcher, mcp, help and version', () => {
    expect(parseCliArgs(['book'], {}, '/h', '/w')).toMatchObject({ command: 'serve', options: { folder: '/w/book' } })
    expect(parseCliArgs(['mcp', '--workspace', '/b'], {}, '/h', '/w')).toEqual({ command: 'mcp', options: { workspaceDir: '/b' } })
    expect(parseCliArgs(['--help'], {}, '/h', '/w')).toEqual({ command: 'help' })
    expect(parseCliArgs(['-v'], {}, '/h', '/w')).toEqual({ command: 'version' })
  })

  it('passes errors through', () => {
    expect(parseCliArgs(['mcp', '--nope'], {}, '/h', '/w')).toHaveProperty('error')
    expect(parseCliArgs(['--port', 'x'], {}, '/h', '/w')).toHaveProperty('error')
  })
})
