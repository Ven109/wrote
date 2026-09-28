import { writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir } from '../test/utils/workspace'
import { appUrl, findFreePort, openCommand, resolveServeTarget, serverEntry, startServer, waitForHealth } from './serve'

describe('resolveServeTarget', () => {
  it('serves a book folder from its parent and opens the book', () => {
    expect(resolveServeTarget('/books/my-novel', path => path === '/books/my-novel/wrote.json')).toEqual({ workspaceDir: '/books', bookId: 'my-novel' })
  })

  it('treats any other folder as the workspace', () => {
    expect(resolveServeTarget('/books', () => false)).toEqual({ workspaceDir: '/books' })
  })
})

describe('appUrl', () => {
  it('links the book or the book list, showing wildcard hosts as localhost', () => {
    expect(appUrl('127.0.0.1', 3000, 'my novel')).toBe('http://127.0.0.1:3000/books/my%20novel')
    expect(appUrl('0.0.0.0', 3001)).toBe('http://localhost:3001/')
    expect(appUrl('::1', 3002)).toBe('http://[::1]:3002/')
  })
})

describe('openCommand', () => {
  it.each([
    ['darwin', ['open', ['http://x']]],
    ['win32', ['cmd', ['/c', 'start', '""', 'http://x']]],
    ['linux', ['xdg-open', ['http://x']]],
  ] as const)('uses the %s opener', (os, expected) => {
    expect(openCommand('http://x', os)).toEqual(expected)
  })
})

describe('serverEntry', () => {
  it('points from the CLI bundle to the built Nitro server', () => {
    expect(serverEntry('/pkg/dist/cli/wrote.mjs')).toBe('/pkg/.output/server/index.mjs')
  })
})

describe('findFreePort', () => {
  let blocker: Server | undefined
  afterEach(() => new Promise<void>(done => blocker ? blocker.close(() => done()) : done()))

  it('skips a port that is taken', async () => {
    const taken = await findFreePort(24_000, '127.0.0.1')
    blocker = createServer()
    await new Promise<void>(done => blocker!.listen(taken, '127.0.0.1', done))
    expect(await findFreePort(taken, '127.0.0.1')).toBeGreaterThan(taken)
  })
})

describe('startServer', () => {
  it('starts the server with the workspace, host and port and waits until it is healthy', async () => {
    const dir = await createTempDir('wrote-cli-')
    const entry = join(dir, 'index.mjs')
    // A stand-in for the Nitro server: answers the health check and echoes its environment.
    await writeFile(entry, `import { createServer } from 'node:http'
createServer((req, res) => res.end(JSON.stringify({ path: req.url, workspace: process.env.NUXT_WORKSPACE_DIR })))
  .listen(Number(process.env.PORT), process.env.HOST)`)
    const port = await findFreePort(24_100, '127.0.0.1')
    const workspaceDir = join(dir, 'books')
    const child = await startServer({ entry, target: { workspaceDir }, host: '127.0.0.1', port })
    try {
      await waitForHealth(`http://127.0.0.1:${port}/api/health`, child, 10_000)
      const body = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json()
      expect(body).toEqual({ path: '/api/health', workspace: workspaceDir })
    }
    finally {
      child.kill()
    }
  })

  it('explains a missing build', async () => {
    await expect(startServer({ entry: '/nope/index.mjs', target: { workspaceDir: '/tmp' }, host: '127.0.0.1', port: 1 })).rejects.toThrow('pnpm build')
  })
})
