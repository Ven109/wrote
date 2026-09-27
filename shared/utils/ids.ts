import type { EntryType } from '../schemas/entry'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

export const ID_PREFIXES = {
  'part': 'prt',
  'chapter': 'chp',
  'scene': 'scn',
  'note': 'nte',
  'codex': 'cdx',
  'research': 'rsc',
  'outline': 'otl',
  'style-guide': 'sty',
} as const satisfies Record<EntryType, string>

function randomSuffix(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let suffix = ''
  for (const byte of bytes) suffix += ALPHABET[byte % ALPHABET.length]
  return suffix
}

/** Creates a stable, filename-independent entry id such as `scn_k3j9x2m1q0`. */
export function createId(type: EntryType, length = 10): string {
  return `${ID_PREFIXES[type]}_${randomSuffix(length)}`
}

/** Id for non-entry records (jobs, threads, …), e.g. `job_k3j9x2m1q0k2`. */
export function createRecordId(prefix: string, length = 12): string {
  return `${prefix}_${randomSuffix(length)}`
}
