import { Extension } from '@tiptap/core'
import type { Node as PmNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Suggestion } from '#shared/schemas/suggestion'
import { docTextIndex, locateSuggestion, markdownToDisplay } from '../suggestion-anchor'

export const aiSuggestionsKey = new PluginKey<AiSuggestionsState>('aiSuggestions')

export type SuggestionAction = 'accept' | 'reject' | 'edit'
/** Dispatched (bubbling) from the editor DOM when a suggestion's inline control is used. */
export const SUGGESTION_ACTION_EVENT = 'wrote:suggestion-action'
export interface SuggestionActionDetail {
  id: string
  action: SuggestionAction
}

type ShownSuggestion = Pick<Suggestion, 'id' | 'kind' | 'find' | 'replace' | 'before' | 'after' | 'author'>

interface AiSuggestionsState {
  suggestions: ShownSuggestion[]
  decorations: DecorationSet
}

const ACTIONS: [SuggestionAction, string, string][] = [
  ['accept', '✓', 'Accept suggestion'],
  ['reject', '✕', 'Reject suggestion'],
  ['edit', '✎', 'Edit suggestion'],
]

function controls(suggestion: ShownSuggestion): HTMLElement {
  const bar = document.createElement('span')
  bar.className = 'ai-suggestion-controls'
  bar.contentEditable = 'false'
  for (const [action, symbol, label] of ACTIONS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = symbol
    button.setAttribute('aria-label', `${label} by ${suggestion.author.name}`)
    button.dataset.action = action
    // mousedown: act before the editor moves the selection; keyboard users get click.
    const fire = (event: Event) => {
      event.preventDefault()
      button.dispatchEvent(new CustomEvent<SuggestionActionDetail>(SUGGESTION_ACTION_EVENT, { bubbles: true, detail: { id: suggestion.id, action } }))
    }
    button.addEventListener('mousedown', fire)
    button.addEventListener('click', event => event.detail === 0 && fire(event))
    bar.append(button)
  }
  return bar
}

function proposal(suggestion: ShownSuggestion, block: boolean): HTMLElement {
  const wrapper = document.createElement(block ? 'div' : 'span')
  wrapper.className = block ? 'ai-suggestion-block' : 'ai-suggestion-widget'
  wrapper.dataset.suggestionId = suggestion.id
  const inserted = document.createElement('ins')
  inserted.className = 'ai-suggestion-ins'
  inserted.textContent = block ? markdownToDisplay(suggestion.replace) : markdownToDisplay(suggestion.replace).replace(/\s+/g, ' ')
  wrapper.append(inserted, controls(suggestion))
  return wrapper
}

function decorate(doc: PmNode, suggestions: ShownSuggestion[]): DecorationSet {
  const index = docTextIndex(doc)
  const decorations: Decoration[] = []
  for (const suggestion of suggestions) {
    const range = locateSuggestion(doc, suggestion, index)
    if (!range) continue
    const spec = { suggestionId: suggestion.id, kind: suggestion.kind }
    if (suggestion.kind === 'insert') {
      const end = doc.resolve(range.to).after(doc.resolve(range.to).depth)
      decorations.push(Decoration.inline(range.from, range.to, { class: 'ai-suggestion-anchor' }, spec))
      decorations.push(Decoration.widget(end, () => proposal(suggestion, true), { ...spec, side: 1, key: `ins-${suggestion.id}` }))
    }
    else {
      decorations.push(Decoration.inline(range.from, range.to, { 'class': 'ai-suggestion-del', 'data-suggestion-id': suggestion.id }, spec))
      decorations.push(Decoration.widget(range.to, () => proposal(suggestion, false), { ...spec, side: 1, key: `rep-${suggestion.id}` }))
    }
  }
  return DecorationSet.create(doc, decorations)
}

function apply(tr: Transaction, value: AiSuggestionsState, _old: EditorState, state: EditorState): AiSuggestionsState {
  const next = tr.getMeta(aiSuggestionsKey) as { suggestions: ShownSuggestion[] } | undefined
  if (next) return { suggestions: next.suggestions, decorations: decorate(state.doc, next.suggestions) }
  // Ranges follow edits (mapping); a suggestion whose text was edited away simply stops showing.
  return tr.docChanged ? { ...value, decorations: value.decorations.map(tr.mapping, tr.doc) } : value
}

/**
 * Shows pending AI suggestions as tracked changes: the original struck through, the proposal highlighted,
 * with accept / reject / edit controls; block proposals appear as a highlighted block after their paragraph.
 * Decorations only – nothing reaches the Markdown until a suggestion is accepted.
 */
export const AiSuggestions = Extension.create({
  name: 'aiSuggestions',
  addProseMirrorPlugins() {
    return [new Plugin<AiSuggestionsState>({
      key: aiSuggestionsKey,
      state: {
        init: () => ({ suggestions: [], decorations: DecorationSet.empty }),
        apply,
      },
      props: {
        decorations: state => aiSuggestionsKey.getState(state)?.decorations,
      },
    })]
  },
})

/** Replaces the suggestions to show and locates them in the document. */
export function setSuggestions(state: EditorState, suggestions: ShownSuggestion[]): Transaction {
  return state.tr.setMeta(aiSuggestionsKey, { suggestions }).setMeta('addToHistory', false)
}

/** The current (mapped) range of a suggestion's passage, or `null` if it is not shown. */
export function suggestionRange(state: EditorState, id: string): { from: number, to: number } | null {
  const found = aiSuggestionsKey.getState(state)?.decorations.find(undefined, undefined, spec => spec.suggestionId === id && !('side' in spec))
  return found?.[0] ? { from: found[0].from, to: found[0].to } : null
}
