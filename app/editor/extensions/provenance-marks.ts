import { Extension } from '@tiptap/core'
import type { Node as PmNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { ResolvedProvenance } from '#shared/schemas/provenance'
import { docTextIndex, locateSuggestion } from '../suggestion-anchor'

export const provenanceKey = new PluginKey<DecorationSet>('provenanceMarks')

type ShownRange = Pick<ResolvedProvenance, 'id' | 'text' | 'before' | 'after' | 'author' | 'model' | 'acceptedAt'>

/** Tooltip for a highlighted passage: who wrote it, with which model, when it was accepted. */
export function provenanceLabel(range: Pick<ResolvedProvenance, 'author' | 'model' | 'acceptedAt'>): string {
  const date = new Date(range.acceptedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
  return [`AI-assisted: ${range.author.name}`, range.model, `accepted ${date}`].filter(Boolean).join(' · ')
}

function decorate(doc: PmNode, ranges: ShownRange[]): DecorationSet {
  const index = docTextIndex(doc)
  const decorations = ranges.flatMap((range) => {
    const found = locateSuggestion(doc, { find: range.text, before: range.before, after: range.after }, index)
    return found ? [Decoration.inline(found.from, found.to, { 'class': 'ai-provenance', 'title': provenanceLabel(range), 'data-provenance-id': range.id })] : []
  })
  return DecorationSet.create(doc, decorations)
}

/**
 * Highlights AI-assisted passages (accepted AI text) when the author turns it on. Decorations only: provenance
 * lives in a sidecar file, never in the Markdown. Feed ranges (or `[]` to hide) with `setProvenanceRanges`.
 */
export const ProvenanceMarks = Extension.create({
  name: 'provenanceMarks',
  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key: provenanceKey,
      state: {
        init: () => DecorationSet.empty,
        apply(tr: Transaction, value: DecorationSet, _old: EditorState, state: EditorState) {
          const ranges = tr.getMeta(provenanceKey) as ShownRange[] | undefined
          if (ranges) return decorate(state.doc, ranges)
          return tr.docChanged ? value.map(tr.mapping, tr.doc) : value
        },
      },
      props: { decorations: state => provenanceKey.getState(state) },
    })]
  },
})

export function setProvenanceRanges(state: EditorState, ranges: ShownRange[]): Transaction {
  return state.tr.setMeta(provenanceKey, ranges).setMeta('addToHistory', false)
}
