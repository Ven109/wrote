import type { AnyExtension } from '@tiptap/core'
import { AiSuggestions } from './ai-suggestions'
import { BlockMove } from './block-move'
import { CodexMentions } from './codex-mentions'
import { CommentHighlights } from './comment-highlights'
import { GhostText } from './ghost-text'
import { ProvenanceMarks } from './provenance-marks'
import { WikiLink } from './wiki-link'

/**
 * Wrote's extensions on top of the ones `UEditor` ships (StarterKit, Markdown, Image, …).
 * `wikiLink` swaps in the interactive node view in the browser.
 */
export function wroteExtensions(options: { wikiLink?: AnyExtension } = {}): AnyExtension[] {
  return [options.wikiLink ?? WikiLink, BlockMove, CodexMentions, AiSuggestions, CommentHighlights, GhostText, ProvenanceMarks]
}
