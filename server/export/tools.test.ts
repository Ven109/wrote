import { describe, expect, it } from 'vitest'
import { detectTool, exportCapabilities, installHints, toolCommand } from './tools'

describe('export tools', () => {
  it('uses an explicit path from the environment, else the name on PATH', () => {
    expect(toolCommand('pandoc', { WROTE_PANDOC_PATH: '/opt/pandoc' })).toBe('/opt/pandoc')
    expect(toolCommand('typst', {})).toBe('typst')
  })

  it('reports a missing tool with install guidance and the formats it blocks', async () => {
    const env = { ...process.env, WROTE_PANDOC_PATH: '/nonexistent/pandoc', WROTE_TYPST_PATH: '/nonexistent/typst' }
    expect(await detectTool('pandoc', env)).toEqual({ tool: 'pandoc', version: null, path: null })
    const capabilities = await exportCapabilities({ fresh: true, env })
    expect(capabilities.formats.filter(f => f.available).map(f => f.format)).toEqual(['md'])
    expect(capabilities.install.pandoc).toContain('WROTE_PANDOC_PATH')
    expect(installHints(['typst'], 'darwin').typst).toContain('brew install typst')
  })
})
