/** Cheap line-level flags for the line editor: candidates the model confirms or ignores (never stored as is). */
export interface HeuristicFlag {
  category: 'repetition' | 'filter-words' | 'adverbs' | 'passive-voice'
  quote: string
  note: string
}

const FILTER_WORDS = /\b(?:felt|feel|feels|saw|see|sees|heard|hear|hears|noticed|notice|realized|realised|wondered|seemed|watched|decided|knew|thought)\b/i
const DIALOGUE_ADVERB = /\b(?:said|asked|whispered|replied|shouted|muttered)\s+\w+ly\b/i
const PASSIVE = /\b(?:was|were|been|being|is|are)\s+(?:\w+ly\s+)?(\w+ed|\w+en)\b(?:\s+by\b)?/i
const STOPWORDS = new Set(['that', 'with', 'from', 'have', 'there', 'their', 'which', 'would', 'could', 'should', 'about', 'into', 'were', 'what', 'when', 'where', 'they', 'them', 'this', 'then', 'than', 'been', 'said'])
const MAX_FLAGS = 20

function sentences(text: string): string[] {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, label?: string) => label ?? target)
    .split(/\n{2,}|(?<=[.!?…])\s+/).map(sentence => sentence.trim()).filter(sentence => sentence.length > 3)
}

/** Words of five or more letters used three or more times within a window of consecutive sentences. */
function repetitions(list: string[], window = 4): HeuristicFlag[] {
  const flags: HeuristicFlag[] = []
  const seen = new Set<string>()
  for (let start = 0; start < list.length; start++) {
    const chunk = list.slice(start, start + window)
    const counts = new Map<string, number>()
    for (const word of chunk.join(' ').toLowerCase().match(/\b[a-z']{5,}\b/g) ?? []) if (!STOPWORDS.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1)
    for (const [word, count] of counts) {
      if (count < 3 || seen.has(word)) continue
      seen.add(word)
      const sentence = chunk.find(candidate => candidate.toLowerCase().includes(word))!
      flags.push({ category: 'repetition', quote: sentence, note: `"${word}" appears ${count} times in a few sentences` })
    }
  }
  return flags
}

/** Line-level flags in reading order (at most 20). */
export function lineHeuristics(text: string): HeuristicFlag[] {
  const list = sentences(text)
  const flags: HeuristicFlag[] = []
  for (const sentence of list) {
    const filter = FILTER_WORDS.exec(sentence)
    if (filter) flags.push({ category: 'filter-words', quote: sentence, note: `filter word "${filter[0]}"` })
    const adverb = DIALOGUE_ADVERB.exec(sentence)
    if (adverb) flags.push({ category: 'adverbs', quote: sentence, note: `adverb in a dialogue tag: "${adverb[0]}"` })
    const passive = PASSIVE.exec(sentence)
    if (passive && /\bby\b/.test(passive[0])) flags.push({ category: 'passive-voice', quote: sentence, note: `passive voice: "${passive[0]}"` })
  }
  return [...flags, ...repetitions(list)].slice(0, MAX_FLAGS)
}
