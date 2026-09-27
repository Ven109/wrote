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

/** Creates a stable, filename-independent entry id such as `scn_k3j9x2m1q0`. */
export function createId(type: EntryType, length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let suffix = ''
  for (const byte of bytes) suffix += ALPHABET[byte % ALPHABET.length]
  return `${ID_PREFIXES[type]}_${suffix}`
}
