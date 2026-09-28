import { diffSequences } from './line-diff'

/** One block (paragraph, heading, list, fenced code …) of a diff between a snapshot and the current text. */
export interface BlockChange {
  kind: 'same' | 'added' | 'removed' | 'changed'
  /** The block in the snapshot (`null` when added since). */
  before: string | null
  /** The block now (`null` when removed since). */
  after: string | null
}

const FRONTMATTER = /^---\n[\s\S]*?\n---(?:\n|$)/
const isFrontmatter = (block: string) => block.startsWith('---\n') && block.endsWith('\n---')

/** Text without the frontmatter's `updated:` stamp, which every save bumps – not a change worth showing. */
export const withoutUpdatedStamp = (text: string | null) => text?.replace(/^(---\n[\s\S]*?)^updated: .*(?:\n|$)([\s\S]*?^---)/m, '$1$2') ?? null

/** Splits Markdown into blocks at blank lines; YAML frontmatter and fenced code each stay one block. */
export function splitBlocks(text: string | null): string[] {
  if (!text) return []
  const frontmatter = FRONTMATTER.exec(text)?.[0]
  const blocks: string[] = frontmatter ? [frontmatter.replace(/\n$/, '')] : []
  let current: string[] = []
  let fence: string | null = null
  for (const line of text.slice(frontmatter?.length ?? 0).replace(/\n+$/, '').split('\n')) {
    const marker = /^(`{3,}|~{3,})/.exec(line)?.[1]
    if (marker) fence = fence === null ? marker : line.startsWith(fence) ? null : fence
    if (!line.trim() && fence === null) {
      if (current.length) blocks.push(current.join('\n'))
      current = []
    }
    else {
      current.push(line)
    }
  }
  if (current.length) blocks.push(current.join('\n'))
  return blocks
}

/**
 * Block-aware diff of a snapshot (`before`) and the current text (`after`): unchanged blocks, blocks added or
 * removed since, and changed blocks (a removal directly followed by an addition is paired).
 */
export function diffBlocks(before: string | null, after: string | null): BlockChange[] {
  const ops = diffSequences(splitBlocks(before), splitBlocks(after))
  const result: BlockChange[] = []
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!
    if (op.kind === 'same') {
      result.push({ kind: 'same', before: op.item, after: op.item })
      continue
    }
    // Pair a run of removals with the run of additions that follows it.
    let removed = 0
    while (ops[i + removed]?.kind === 'removed') removed++
    let added = 0
    while (ops[i + removed + added]?.kind === 'added') added++
    for (let k = 0; k < Math.max(removed, added); k++) {
      const gone = k < removed ? ops[i + k]!.item : null
      const come = k < added ? ops[i + removed + k]!.item : null
      const stampOnly = gone !== null && come !== null && withoutUpdatedStamp(gone) === withoutUpdatedStamp(come)
      result.push({ kind: gone === null ? 'added' : come === null ? 'removed' : stampOnly ? 'same' : 'changed', before: gone, after: come })
    }
    i += removed + added - 1
  }
  return result
}

/** Rebuilds the text from a diff, taking the snapshot's version for the changes in `restore` (indices). */
export function applyBlockRestore(changes: BlockChange[], restore: Set<number>): string {
  const blocks = changes.flatMap((change, index) => {
    const block = restore.has(index) ? change.before : change.after
    return block === null ? [] : [block]
  })
  if (!blocks.length) return ''
  const [first, ...rest] = blocks
  // Frontmatter is followed by the body directly (no blank line), as Wrote writes files.
  return first !== undefined && isFrontmatter(first) ? `${first}\n${rest.join('\n\n')}${rest.length ? '\n' : ''}` : `${blocks.join('\n\n')}\n`
}
