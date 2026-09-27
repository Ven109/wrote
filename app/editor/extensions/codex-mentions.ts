import { Extension } from '@tiptap/core'
import type { Node as PmNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { NameMatcher } from '#shared/utils/name-matcher'

export const codexMentionsKey = new PluginKey<CodexMentionsState>('codexMentions')

interface CodexMentionsState {
  matcher: NameMatcher | null
  decorations: DecorationSet
}

/** Placeholder for non-text content (atoms, code) so offsets map 1:1 to document positions. */
const OPAQUE = '￼'

function blockText(block: PmNode): string {
  let text = ''
  block.forEach((child) => {
    const opaque = !child.isText || child.marks.some(mark => mark.type.name === 'code')
    text += opaque ? OPAQUE.repeat(child.nodeSize) : child.text!
  })
  return text
}

function scanBlock(matcher: NameMatcher, block: PmNode, pos: number): Decoration[] {
  if (block.type.spec.code) return []
  return matcher.find(blockText(block)).map(match => Decoration.inline(pos + 1 + match.from, pos + 1 + match.to, {
    'class': 'codex-mention',
    'data-entry-id': match.entryId,
  }))
}

function scanAll(matcher: NameMatcher, doc: PmNode): DecorationSet {
  const decorations: Decoration[] = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    decorations.push(...scanBlock(matcher, node, pos))
    return false
  })
  return DecorationSet.create(doc, decorations)
}

/** Document ranges touched by a transaction (in the new document). */
function changedRanges(tr: Transaction): [number, number][] {
  const ranges: [number, number][] = []
  tr.steps.forEach((step, index) => {
    const rest = tr.mapping.slice(index + 1)
    step.getMap().forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      ranges.push([rest.map(newStart, -1), rest.map(newEnd, 1)])
    })
  })
  return ranges
}

/** Re-scans only the textblocks that a transaction changed. */
function rescanChanged(matcher: NameMatcher, tr: Transaction, previous: DecorationSet): DecorationSet {
  let decorations = previous.map(tr.mapping, tr.doc)
  const blocks = new Map<number, PmNode>()
  for (const [from, to] of changedRanges(tr)) {
    tr.doc.nodesBetween(Math.max(0, from), Math.min(tr.doc.content.size, Math.max(from, to)), (node, pos) => {
      if (!node.isTextblock) return true
      blocks.set(pos, node)
      return false
    })
  }
  for (const [pos, block] of blocks) {
    decorations = decorations.remove(decorations.find(pos, pos + block.nodeSize))
    decorations = decorations.add(tr.doc, scanBlock(matcher, block, pos))
  }
  return decorations
}

function apply(tr: Transaction, value: CodexMentionsState, _old: EditorState, state: EditorState): CodexMentionsState {
  const next = tr.getMeta(codexMentionsKey) as { matcher: NameMatcher | null } | undefined
  if (next) return { matcher: next.matcher, decorations: next.matcher ? scanAll(next.matcher, state.doc) : DecorationSet.empty }
  if (!tr.docChanged || !value.matcher) return value
  return { matcher: value.matcher, decorations: rescanChanged(value.matcher, tr, value.decorations) }
}

/**
 * Highlights codex names and aliases in prose as decorations (never stored in the Markdown).
 * Incremental: a transaction only re-scans the textblocks it touched. Feed names with `setCodexMatcher`.
 */
export const CodexMentions = Extension.create({
  name: 'codexMentions',
  addProseMirrorPlugins() {
    return [new Plugin<CodexMentionsState>({
      key: codexMentionsKey,
      state: {
        init: () => ({ matcher: null, decorations: DecorationSet.empty }),
        apply,
      },
      props: {
        decorations: state => codexMentionsKey.getState(state)?.decorations,
      },
    })]
  },
})

/** Replaces the names to detect (e.g. after codex changes) and re-scans the document. */
export function setCodexMatcher(state: EditorState, matcher: NameMatcher | null): Transaction {
  return state.tr.setMeta(codexMentionsKey, { matcher }).setMeta('addToHistory', false)
}
