import { describe, expect, it } from 'vitest'
import type { LinkRef } from '#shared/schemas/links'
import { pickerGroups } from './link-picker'

const ref = (title: string, type: LinkRef['type']): LinkRef => ({ id: `x_${title}`, path: `${title}.md`, type, title })

describe('pickerGroups', () => {
  it('groups entries by section with labels and skips empty groups', () => {
    const groups = pickerGroups([ref('Arrival', 'scene'), ref('Mara', 'codex'), ref('Part One', 'part')])
    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual([
      { type: 'label', label: 'Manuscript' },
      { kind: 'wikiLink', target: 'Arrival', label: 'Arrival', icon: 'i-lucide-feather' },
      { kind: 'wikiLink', target: 'Part One', label: 'Part One', icon: 'i-lucide-feather' },
    ])
    expect(groups[1]![0]).toEqual({ type: 'label', label: 'Codex' })
  })
})
