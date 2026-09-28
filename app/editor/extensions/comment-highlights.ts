import { Extension } from '@tiptap/core'
import type { Node as PmNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Comment } from '#shared/schemas/comments'
import { docTextIndex, locateSuggestion } from '../suggestion-anchor'

export const commentHighlightsKey = new PluginKey<DecorationSet>('commentHighlights')
/** Dispatched (bubbling) from the editor DOM when a highlighted passage is clicked. */
export const COMMENT_FOCUS_EVENT = 'wrote:comment-focus'

type ShownComment = Pick<Comment, 'id' | 'quote' | 'before' | 'after'>

function decorate(doc: PmNode, comments: ShownComment[], active: string | null): DecorationSet {
  const index = docTextIndex(doc)
  const decorations = comments.flatMap((comment) => {
    const found = locateSuggestion(doc, { find: comment.quote, before: comment.before, after: comment.after }, index)
    const className = comment.id === active ? 'comment-highlight comment-highlight-active' : 'comment-highlight'
    return found ? [Decoration.inline(found.from, found.to, { 'class': className, 'data-comment-id': comment.id }, { commentId: comment.id })] : []
  })
  return DecorationSet.create(doc, decorations)
}

/**
 * Highlights passages that have comments; clicking one focuses its card. Decorations only – comments live
 * in the app state, never in the Markdown. Feed them with `setCommentHighlights`.
 */
export const CommentHighlights = Extension.create({
  name: 'commentHighlights',
  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key: commentHighlightsKey,
      state: {
        init: () => DecorationSet.empty,
        apply(tr: Transaction, value: DecorationSet, _old: EditorState, state: EditorState) {
          const next = tr.getMeta(commentHighlightsKey) as { comments: ShownComment[], active: string | null } | undefined
          if (next) return decorate(state.doc, next.comments, next.active)
          return tr.docChanged ? value.map(tr.mapping, tr.doc) : value
        },
      },
      props: {
        decorations: state => commentHighlightsKey.getState(state),
        handleClick(view, pos) {
          const [hit] = commentHighlightsKey.getState(view.state)?.find(pos, pos) ?? []
          const id = (hit?.spec as { commentId?: string } | undefined)?.commentId
          if (id) view.dom.dispatchEvent(new CustomEvent<string>(COMMENT_FOCUS_EVENT, { bubbles: true, detail: id }))
          return false
        },
      },
    })]
  },
})

export function setCommentHighlights(state: EditorState, comments: ShownComment[], active: string | null = null): Transaction {
  return state.tr.setMeta(commentHighlightsKey, { comments, active }).setMeta('addToHistory', false)
}

/** Where each shown comment's passage currently starts (document position), by comment id. */
export function commentPositions(state: EditorState): Map<string, number> {
  const positions = new Map<string, number>()
  for (const decoration of commentHighlightsKey.getState(state)?.find() ?? []) {
    const id = (decoration.spec as { commentId?: string }).commentId
    if (id && !positions.has(id)) positions.set(id, decoration.from)
  }
  return positions
}
