import { readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTempDir } from '../../test/utils/workspace'
import { BEAT_SHEETS_DIR, listBeatSheets, parseBeatSheet } from './beat-sheets'

let workspace: string
beforeEach(async () => {
  workspace = await createTempDir('wrote-sheets-')
})

describe('listBeatSheets', () => {
  it('copies the built-in templates into the workspace on first use', async () => {
    const { folder, sheets } = await listBeatSheets(workspace)
    expect(folder).toBe(join(workspace, BEAT_SHEETS_DIR))
    expect(sheets.map(sheet => sheet.title)).toEqual(['Hero\'s Journey', 'Kishōtenketsu', 'Save the Cat', 'Snowflake', 'Three Acts'])
    expect((await readdir(folder)).sort()).toEqual(['heros-journey.md', 'kishotenketsu.md', 'save-the-cat.md', 'snowflake.md', 'three-acts.md'])
    const cat = sheets.find(sheet => sheet.id === 'save-the-cat')!
    expect(cat.outline.acts.flatMap(act => act.beats)).toHaveLength(15)
  })

  it('lists edited and custom files and does not restore deleted built-ins', async () => {
    const { folder } = await listBeatSheets(workspace)
    await rm(join(folder, 'snowflake.md'))
    await writeFile(join(folder, 'mine.md'), '---\ntitle: My structure\n---\n## Part A\n\n### Start\n\nGo.\n')
    const { sheets } = await listBeatSheets(workspace)
    expect(sheets.map(sheet => sheet.id)).toEqual(['heros-journey', 'kishotenketsu', 'mine', 'save-the-cat', 'three-acts'])
    expect(sheets.find(sheet => sheet.id === 'mine')!.outline.acts[0]!.beats[0]).toMatchObject({ title: 'Start', summary: 'Go.' })
  })
})

describe('parseBeatSheet', () => {
  it('falls back to the file name and skips broken frontmatter', () => {
    expect(parseBeatSheet('plain.md', '## A\n')).toMatchObject({ id: 'plain', title: 'plain', description: '' })
    expect(parseBeatSheet('broken.md', '---\ntitle: [\n---\n')).toBeNull()
  })
})
