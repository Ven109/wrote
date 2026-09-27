import { VueNodeViewRenderer } from '@tiptap/vue-3'
import WikiLinkChip from '~/components/editor/nodes/WikiLinkChip.vue'
import { WikiLink } from './wiki-link'

/** `WikiLink` rendered as an interactive chip (browser only; the headless editor uses plain HTML). */
export const WikiLinkView = WikiLink.extend({
  addNodeView() {
    return VueNodeViewRenderer(WikiLinkChip)
  },
})
