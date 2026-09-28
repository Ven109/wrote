import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CalloutBlockView from '~/components/editor/nodes/CalloutBlockView.vue'
import CodexCardView from '~/components/editor/nodes/CodexCardView.vue'
import NoteBlockView from '~/components/editor/nodes/NoteBlockView.vue'
import { CalloutBlock } from './callout-block'
import { CodexCard } from './codex-card'
import { NoteBlock } from './note-block'

/** Custom blocks with their Vue node views (browser only; the headless editor renders plain HTML). */
export const BLOCK_VIEWS = {
  note: NoteBlock.extend({ addNodeView: () => VueNodeViewRenderer(NoteBlockView) }),
  callout: CalloutBlock.extend({ addNodeView: () => VueNodeViewRenderer(CalloutBlockView) }),
  codexCard: CodexCard.extend({ addNodeView: () => VueNodeViewRenderer(CodexCardView) }),
}
