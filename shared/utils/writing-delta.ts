import { diffBlocks } from './block-diff'
import { countWords } from './word-count'
import { lcs, words } from './word-diff'

export interface WritingDelta {
  /** Change of the word count (negative when text was cut). */
  net: number
  /** Words written – typed or retyped – not counting text moved from elsewhere. */
  added: number
  /** Words deleted, not counting text moved elsewhere. */
  deleted: number
  /** Normalized texts of blocks removed here, so a paste into another scene soon after counts as a move. */
  removedBlocks: string[]
}

/** Blocks compared for moves ignore whitespace and case. */
export const normalizeBlock = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Words added, deleted and net between two versions of a text. Blocks that were cut and pasted elsewhere in the
 * same text – or removed recently elsewhere (`recentlyRemoved`) – are moves: they count neither as added nor as
 * deleted. Within changed blocks, words are compared in order (word LCS), so a rewritten sentence counts.
 */
export function writingDelta(before: string, after: string, recentlyRemoved: ReadonlySet<string> = new Set()): WritingDelta {
  const blocks = diffBlocks(before, after)
  const removed = blocks.filter(block => block.kind === 'removed').map(block => normalizeBlock(block.before!))
  const addedTexts = new Set(blocks.filter(block => block.kind === 'added').map(block => normalizeBlock(block.after!)))
  const removedHere = new Set(removed)
  let added = 0
  let deleted = 0
  for (const block of blocks) {
    if (block.kind === 'added') {
      const text = normalizeBlock(block.after!)
      if (!removedHere.has(text) && !recentlyRemoved.has(text)) added += countWords(block.after!)
    }
    else if (block.kind === 'removed') {
      if (!addedTexts.has(normalizeBlock(block.before!))) deleted += countWords(block.before!)
    }
    else if (block.kind === 'changed') {
      const [old, next] = [words(block.before!).slice(0, 5000), words(block.after!).slice(0, 5000)]
      const common = lcs(old, next)
      added += next.length - common
      deleted += old.length - common
    }
  }
  return { net: countWords(after) - countWords(before), added, deleted, removedBlocks: removed.filter(text => !addedTexts.has(text)) }
}
