import { describe, expect, it } from 'vitest'
import { parseAgentFile, serializeAgentFile } from './agent-files'

const VICTORIAN = `---
name: Victorian dialogue checker
description: Flags modern words in dialogue.
scopes: [scene, chapter]
model: fast
tools: [heuristics]
---
Check that dialogue sounds like 1880s London. Flag modern words and idioms.
`

describe('agent files', () => {
  it('parses frontmatter settings and body instructions, with the file name as id', () => {
    expect(parseAgentFile('victorian-dialogue.md', VICTORIAN)).toEqual({ agent: {
      id: 'victorian-dialogue',
      name: 'Victorian dialogue checker',
      description: 'Flags modern words in dialogue.',
      instructions: 'Check that dialogue sounds like 1880s London. Flag modern words and idioms.',
      scopes: ['scene', 'chapter'],
      task: 'fast',
      tools: ['heuristics'],
      summary: false,
      categories: [],
      source: 'book',
    } })
  })

  it('round-trips through serialize', () => {
    const { agent } = parseAgentFile('victorian-dialogue.md', VICTORIAN) as { agent: Parameters<typeof serializeAgentFile>[0] }
    expect(parseAgentFile('victorian-dialogue.md', serializeAgentFile(agent))).toEqual({ agent })
  })

  it('reports invalid files with the reason instead of dropping them silently', () => {
    expect(parseAgentFile('Bad Name.md', VICTORIAN)).toMatchObject({ problem: { file: 'agents/Bad Name.md', message: expect.stringContaining('id') } })
    expect(parseAgentFile('empty.md', '---\nname: Empty\n---\n')).toMatchObject({ problem: { message: expect.stringContaining('instructions') } })
    expect(parseAgentFile('scopes.md', '---\nname: X\nscopes: [page]\n---\nDo it.')).toMatchObject({ problem: { message: expect.stringContaining('scopes') } })
    expect(parseAgentFile('yaml.md', '---\nname: [\n---\nDo it.')).toMatchObject({ problem: { file: 'agents/yaml.md' } })
  })
})
