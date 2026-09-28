import { parse, stringify } from 'yaml'
import { ExportPresetSchema, PresetIdSchema, type ExportPreset, type ExportPresetView, type PresetList } from '#shared/schemas/export-preset'
import { BUILTIN_PRESETS } from '../export/builtin-presets'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { deletePresetFile, readPresetFiles, writePresetFile } from '../storage/presets'
import type { BookContext } from './workspace'

const issues = (error: { issues: { path: PropertyKey[], message: string }[] }) =>
  error.issues.map(issue => `${issue.path.join('.') || 'preset'}: ${issue.message}`).join('; ')

/** Parses a preset from YAML; a clear message (field: problem) when it is invalid. */
export function parsePreset(text: string): ExportPreset {
  let raw: unknown
  try {
    raw = parse(text)
  }
  catch (error) {
    throw new InvalidInputError(`Not valid YAML: ${(error as Error).message.split('\n')[0]}`)
  }
  const result = ExportPresetSchema.safeParse(raw ?? {})
  if (!result.success) throw new InvalidInputError(`Invalid preset – ${issues(result.error)}`)
  return result.data
}

export const presetYaml = (preset: ExportPreset) => stringify(preset)

/** Built-in presets plus the book's own; unreadable files are reported, not dropped silently. */
export async function listPresets(book: BookContext): Promise<PresetList> {
  const presets: ExportPresetView[] = Object.entries(BUILTIN_PRESETS).map(([id, preset]) => ({ id, source: 'builtin', ...preset }))
  const errors: PresetList['errors'] = []
  for (const file of await readPresetFiles(book.repository.root)) {
    try {
      if (!PresetIdSchema.safeParse(file.id).success || BUILTIN_PRESETS[file.id]) throw new InvalidInputError(`"${file.id}" is not a usable preset id`)
      presets.push({ id: file.id, source: 'book', ...parsePreset(file.text) })
    }
    catch (error) {
      errors.push({ file: `.wrote/presets/${file.file}`, message: (error as Error).message })
    }
  }
  return { presets, errors }
}

export async function getPreset(book: BookContext, id = 'default'): Promise<ExportPresetView> {
  const { presets, errors } = await listPresets(book)
  const preset = presets.find(candidate => candidate.id === id)
  if (preset) return preset
  const broken = errors.find(error => error.file.endsWith(`/${id}.yaml`) || error.file.endsWith(`/${id}.yml`))
  if (broken) throw new InvalidInputError(`Preset "${id}" cannot be used: ${broken.message}`)
  throw new NotFoundError(`Export preset ${id}`)
}

/** Saves a book preset (built-in ids are reserved). */
export async function savePreset(book: BookContext, id: string, preset: ExportPreset): Promise<ExportPresetView> {
  if (BUILTIN_PRESETS[id]) throw new InvalidInputError(`"${id}" is a built-in preset – save under another name`)
  const parsed = ExportPresetSchema.parse(preset)
  await writePresetFile(book.repository.root, id, presetYaml(parsed))
  return { id, source: 'book', ...parsed }
}

/** Imports a shared preset file; the id defaults to its name. */
export async function importPreset(book: BookContext, input: { id?: string, yaml: string }): Promise<ExportPresetView> {
  const preset = parsePreset(input.yaml)
  const id = input.id ?? preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  if (!PresetIdSchema.safeParse(id).success) throw new InvalidInputError('Choose an id for the imported preset')
  return savePreset(book, id, preset)
}

export async function deletePreset(book: BookContext, id: string): Promise<void> {
  if (BUILTIN_PRESETS[id]) throw new InvalidInputError('Built-in presets cannot be deleted')
  await deletePresetFile(book.repository.root, id)
}

/** A preset as a shareable YAML file. */
export async function exportPresetFile(book: BookContext, id: string): Promise<{ filename: string, yaml: string }> {
  const { id: _id, source: _source, ...preset } = await getPreset(book, id)
  return { filename: `${id}.yaml`, yaml: presetYaml(preset) }
}
