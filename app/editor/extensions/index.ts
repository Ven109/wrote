import type { AnyExtension } from '@tiptap/core'
import { AiSuggestions } from './ai-suggestions'
import { BlockMove } from './block-move'
import { CalloutBlock } from './callout-block'
import { CodexCard } from './codex-card'
import { CodexMentions } from './codex-mentions'
import { CommentHighlights } from './comment-highlights'
import { GhostText } from './ghost-text'
import { HtmlComment } from './html-comment'
import { NoteBlock } from './note-block'
import { ProvenanceMarks } from './provenance-marks'
import { RawDirective } from './raw-directive'
import { SceneBreak } from './scene-break'
import { WikiLink } from './wiki-link'

/**
 * Wrote's extensions on top of the ones `UEditor` ships (StarterKit, Markdown, Image, …).
 * `wikiLink` and `blocks` swap in the interactive node views in the browser.
 */
export function wroteExtensions(options: { wikiLink?: AnyExtension, blocks?: Partial<Record<'note' | 'callout' | 'codexCard', AnyExtension>> } = {}): AnyExtension[] {
  const blocks = [options.blocks?.note ?? NoteBlock, options.blocks?.callout ?? CalloutBlock, options.blocks?.codexCard ?? CodexCard, SceneBreak, RawDirective]
  return [options.wikiLink ?? WikiLink, HtmlComment, ...blocks, BlockMove, CodexMentions, AiSuggestions, CommentHighlights, GhostText, ProvenanceMarks]
}
