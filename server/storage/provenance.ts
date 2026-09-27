import { readdir } from 'node:fs/promises'
import { ProvenanceFileSchema, type ProvenanceFile } from '#shared/schemas/provenance'
import { readTextIfExists, writeFileAtomic } from './fs'
import { resolveInBook } from './paths'

const DIR = '.wrote/provenance'
const ENTRY_ID = /^[a-z]{3}_[a-z0-9]+$/

const pathOf = (root: string, entryId: string) => {
  if (!ENTRY_ID.test(entryId)) throw new Error(`Invalid entry id ${entryId}`)
  return resolveInBook(root, `${DIR}/${entryId}.json`)
}

/** The provenance sidecar of an entry (empty when there is none). */
export async function readProvenanceFile(root: string, entryId: string): Promise<ProvenanceFile> {
  const raw = await readTextIfExists(pathOf(root, entryId))
  return raw ? ProvenanceFileSchema.parse(JSON.parse(raw)) : { version: 1, entryId, ranges: [] }
}

export async function writeProvenanceFile(root: string, file: ProvenanceFile): Promise<void> {
  await writeFileAtomic(pathOf(root, file.entryId), `${JSON.stringify(ProvenanceFileSchema.parse(file), null, 2)}\n`)
}

/** Entries that have a provenance sidecar. */
export async function listProvenanceEntryIds(root: string): Promise<string[]> {
  const names = await readdir(resolveInBook(root, DIR)).catch(() => [] as string[])
  return names.filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).filter(id => ENTRY_ID.test(id))
}
