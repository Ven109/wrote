/** `@agent-id` at the start of a chat message: that turn is answered by the review agent. */
const LEADING = /^@([a-z0-9][a-z0-9-]*)(?=\s|$)/

export function leadingAgentMention(text: string): { agentId: string, rest: string } | null {
  const match = LEADING.exec(text.trimStart())
  return match ? { agentId: match[1]!, rest: text.trimStart().slice(match[0].length).trim() } : null
}

/** The agent id being typed (`@vic` → `vic`), for autocomplete; `null` once a space follows it. */
export function typedAgentPrefix(text: string): string | null {
  const match = /^@([a-z0-9-]*)$/.exec(text.trimStart())
  return match ? match[1]! : null
}
