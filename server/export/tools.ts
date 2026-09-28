import { execFile } from 'node:child_process'
import { platform } from 'node:os'
import { promisify } from 'node:util'
import type { ExportCapabilities, ExportFormat, ExportTool, ExportToolStatus } from '#shared/schemas/export'

const run = promisify(execFile)

/** Which tools each format needs. Markdown needs none. */
export const FORMAT_TOOLS: Record<ExportFormat, ExportTool[]> = {
  epub: ['pandoc'],
  docx: ['pandoc'],
  html: ['pandoc'],
  pdf: ['pandoc', 'typst'],
  md: [],
}

const ENV: Record<ExportTool, string> = { pandoc: 'WROTE_PANDOC_PATH', typst: 'WROTE_TYPST_PATH' }

/** The command for a tool: an explicit path (`WROTE_PANDOC_PATH`, `WROTE_TYPST_PATH`, e.g. bundled binaries) or its name on PATH. */
export const toolCommand = (tool: ExportTool, env: NodeJS.ProcessEnv = process.env) => env[ENV[tool]] || tool

export async function detectTool(tool: ExportTool, env: NodeJS.ProcessEnv = process.env): Promise<ExportToolStatus> {
  const command = toolCommand(tool, env)
  try {
    const { stdout } = await run(command, ['--version'], { timeout: 10_000 })
    const version = /(\d+\.\d+(?:\.\d+)*)/.exec(stdout)?.[1] ?? null
    return { tool, version, path: command }
  }
  catch {
    return { tool, version: null, path: null }
  }
}

const INSTALL: Record<string, Record<ExportTool, string>> = {
  darwin: { pandoc: 'brew install pandoc', typst: 'brew install typst' },
  win32: { pandoc: 'winget install --id JohnMacFarlane.Pandoc', typst: 'winget install --id Typst.Typst' },
  linux: { pandoc: 'sudo apt install pandoc (or see pandoc.org/installing)', typst: 'Download from github.com/typst/typst/releases or: cargo install typst-cli' },
}

/** Install hints for the missing tools on this platform (the Docker image ships both). */
export function installHints(missing: ExportTool[], os: string = platform()): Partial<Record<ExportTool, string>> {
  const hints = INSTALL[os] ?? INSTALL.linux!
  return Object.fromEntries(missing.map(tool => [tool, `${hints[tool]} – or set ${ENV[tool]} to its path.`]))
}

let cached: { at: number, value: ExportCapabilities } | null = null

/** Tool availability and the formats it allows (cached for a minute: installing a tool is noticed quickly). */
export async function exportCapabilities(options: { fresh?: boolean, env?: NodeJS.ProcessEnv } = {}): Promise<ExportCapabilities> {
  if (cached && !options.fresh && Date.now() - cached.at < 60_000) return cached.value
  const tools = await Promise.all((['pandoc', 'typst'] as const).map(tool => detectTool(tool, options.env)))
  const found = new Set(tools.filter(status => status.path).map(status => status.tool))
  const formats = (Object.entries(FORMAT_TOOLS) as [ExportFormat, ExportTool[]][]).map(([format, needs]) => ({ format, needs, available: needs.every(tool => found.has(tool)) }))
  const value = { tools, formats, install: installHints(tools.filter(status => !status.path).map(status => status.tool)) }
  cached = { at: Date.now(), value }
  return value
}

export class MissingToolError extends Error {
  constructor(public tools: ExportTool[], public install: Partial<Record<ExportTool, string>>) {
    super(`Export needs ${tools.join(' and ')}: ${tools.map(tool => install[tool]).join(' ')}`)
  }
}

/** Runs a tool; stderr becomes the error message (trimmed). */
export async function runTool(tool: ExportTool, args: string[], options: { cwd: string, signal?: AbortSignal, timeoutMs?: number }): Promise<void> {
  try {
    await run(toolCommand(tool), args, { cwd: options.cwd, signal: options.signal, timeout: options.timeoutMs ?? 180_000, maxBuffer: 16 * 1024 * 1024 })
  }
  catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim()
    throw new Error(`${tool} failed: ${(stderr || (error as Error).message).slice(0, 800)}`, { cause: error })
  }
}
