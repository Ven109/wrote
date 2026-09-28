import { join } from 'node:path'
import type { BeatSheet, BeatSheetList } from '#shared/schemas/outline'
import { parseMarkdownFile } from '#shared/utils/frontmatter'
import { parseOutline } from '#shared/utils/outline-format'
import { readMarkdownFiles, writeFileAtomic } from '../storage/fs'
import { BUILTIN_BEAT_SHEETS } from './beat-sheet-builtins'

/** Workspace folder shared by all books, so a template written once is reusable everywhere. */
export const BEAT_SHEETS_DIR = join('templates', 'beat-sheets')

/** Parses one template file; `null` when it is not valid Markdown with frontmatter. */
export function parseBeatSheet(fileName: string, source: string): BeatSheet | null {
  const id = fileName.replace(/\.md$/, '')
  try {
    const { data, body } = parseMarkdownFile(source)
    const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : id
    const description = typeof data.description === 'string' ? data.description.trim() : ''
    return { id, title, description, outline: parseOutline(body) }
  }
  catch {
    return null
  }
}

/**
 * The beat-sheet templates of the workspace. The built-in ones are copied into the folder when it does not
 * exist yet; after that the folder is the user's – edited, deleted or added files are what is listed.
 */
export async function listBeatSheets(workspaceDir: string): Promise<BeatSheetList> {
  const folder = join(workspaceDir, BEAT_SHEETS_DIR)
  let files = await readMarkdownFiles(folder)
  if (!files) {
    for (const [name, source] of Object.entries(BUILTIN_BEAT_SHEETS)) await writeFileAtomic(join(folder, name), source)
    files = new Map(Object.entries(BUILTIN_BEAT_SHEETS))
  }
  const sheets = [...files].map(([name, source]) => parseBeatSheet(name, source)).filter((sheet): sheet is BeatSheet => sheet !== null)
  return { folder, sheets: sheets.sort((a, b) => a.title.localeCompare(b.title)) }
}
