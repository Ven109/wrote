import { BlockMove } from './block-move'
import { WikiLink } from './wiki-link'

/** Wrote's extensions on top of the ones `UEditor` ships (StarterKit, Markdown, Image, …). */
export function wroteExtensions() {
  return [WikiLink, BlockMove]
}
