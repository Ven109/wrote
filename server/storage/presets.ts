import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { readTextIfExists, writeFileAtomic } from './fs'

/** Book-level export presets live in `<book>/.wrote/presets/<id>.yaml`. */
const presetDir = (root: string) => join(root, '.wrote', 'presets')

/** The preset files of a book (`id` = file name without extension), sorted by id. */
export async function readPresetFiles(root: string): Promise<{ id: string, file: string, text: string }[]> {
  const names = await readdir(presetDir(root)).catch(() => [] as string[])
  const files = names.filter(name => /\.ya?ml$/.test(name)).sort()
  const read = await Promise.all(files.map(async file => ({ id: file.replace(/\.ya?ml$/, ''), file, text: await readTextIfExists(join(presetDir(root), file)) ?? '' })))
  return read
}

export async function writePresetFile(root: string, id: string, text: string): Promise<void> {
  await writeFileAtomic(join(presetDir(root), `${id}.yaml`), text)
}

export async function deletePresetFile(root: string, id: string): Promise<void> {
  await Promise.all([`${id}.yaml`, `${id}.yml`].map(file => rm(join(presetDir(root), file), { force: true })))
}
