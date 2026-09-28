import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import { basename, dirname, join, resolve } from 'node:path'
import { BOOK_CONFIG_FILE } from '#shared/schemas/book'

export interface ServeTarget {
  workspaceDir: string
  /** Set when the folder is a book: the app opens on it. */
  bookId?: string
}

/** A book folder (has wrote.json) is served from its parent with the book opened; any other folder is the workspace. */
export function resolveServeTarget(folder: string, exists: (path: string) => boolean = existsSync): ServeTarget {
  return exists(join(folder, BOOK_CONFIG_FILE)) ? { workspaceDir: dirname(folder), bookId: basename(folder) } : { workspaceDir: folder }
}

/** The page to open: the book, or the book list. Wildcard hosts are opened as localhost. */
export function appUrl(host: string, port: number, bookId?: string): string {
  const shown = host === '0.0.0.0' || host === '::' ? 'localhost' : host.includes(':') ? `[${host}]` : host
  return `http://${shown}:${port}${bookId ? `/books/${encodeURIComponent(bookId)}` : '/'}`
}

const isFree = (port: number, host: string) => new Promise<boolean>((done) => {
  const server = createServer()
  server.once('error', () => done(false))
  server.listen(port, host, () => server.close(() => done(true)))
})

/** The first port from `start` that nobody listens on (tries `attempts` ports). */
export async function findFreePort(start: number, host: string, attempts = 50): Promise<number> {
  for (let port = start; port < start + attempts && port < 65536; port++) {
    if (await isFree(port, host)) return port
  }
  throw new Error(`No free port between ${start} and ${start + attempts - 1}. Pass one with --port.`)
}

/** The platform's "open this URL" command. */
export function openCommand(url: string, os: NodeJS.Platform = process.platform): [string, string[]] {
  if (os === 'darwin') return ['open', [url]]
  if (os === 'win32') return ['cmd', ['/c', 'start', '""', url]]
  return ['xdg-open', [url]]
}

export function openBrowser(url: string): void {
  const [command, args] = openCommand(url)
  const child = spawn(command, args, { stdio: 'ignore', detached: true })
  child.on('error', () => process.stderr.write(`Could not open a browser; visit ${url}\n`))
  child.unref()
}

/** The built Nitro server next to the CLI bundle: dist/cli/wrote.mjs → .output/server/index.mjs (repo and npm package). */
export const serverEntry = (cliFile: string) => resolve(dirname(cliFile), '../../.output/server/index.mjs')

/** Polls the health endpoint until the server answers (or the process exits / time runs out). */
export async function waitForHealth(url: string, child: ChildProcess, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`The server exited with code ${child.exitCode}.`)
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(2_000) })).ok) return
    }
    catch {
      // not listening yet
    }
    await new Promise(done => setTimeout(done, 250))
  }
  throw new Error(`The server did not answer ${url} within ${timeoutMs / 1000}s.`)
}

export interface StartOptions {
  entry: string
  target: ServeTarget
  host: string
  port: number
  env?: NodeJS.ProcessEnv
}

/** Starts the Nitro server as a child process (logs go to this terminal) for the target workspace. */
export async function startServer({ entry, target, host, port, env = process.env }: StartOptions): Promise<ChildProcess> {
  if (!existsSync(entry)) throw new Error(`The app is not built (${entry} is missing). Run \`pnpm build\` first.`)
  await mkdir(target.workspaceDir, { recursive: true })
  return spawn(process.execPath, [entry], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...env, NODE_ENV: 'production', HOST: host, PORT: String(port), NITRO_HOST: host, NITRO_PORT: String(port), NUXT_WORKSPACE_DIR: target.workspaceDir },
  })
}
