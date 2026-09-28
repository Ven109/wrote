import { BOOK_LAYOUT } from '#shared/book/layout'
import { ReviewAgentSchema, type ReviewAgent } from '#shared/schemas/review'
import { parseAgentFile, serializeAgentFile, type AgentFileProblem } from '../review/agent-files'
import { BUILTIN_AGENTS } from '../review/builtin-agents'
import { NotFoundError } from '../storage/errors'
import type { BookContext } from './workspace'

const pathOf = (id: string) => `${BOOK_LAYOUT.agents}/${id}.md`

/**
 * The book's custom agents from `agents/*.md`, read fresh each time (a new or edited file works without a
 * restart), and the files that are not valid agents.
 */
export async function readCustomAgents(book: BookContext): Promise<{ agents: ReviewAgent[], problems: AgentFileProblem[] }> {
  const files = await book.repository.readFolder(BOOK_LAYOUT.agents)
  const agents: ReviewAgent[] = []
  const problems: AgentFileProblem[] = []
  for (const [name, source] of files ?? []) {
    const parsed = parseAgentFile(name, source)
    if ('agent' in parsed) agents.push(parsed.agent)
    else problems.push(parsed.problem)
  }
  return { agents, problems }
}

/** Built-in agents, then custom ones; a custom agent with a built-in's id replaces it (customised copy). */
export async function listReviewAgents(book: BookContext): Promise<ReviewAgent[]> {
  const { agents: custom } = await readCustomAgents(book)
  const ids = new Set(custom.map(agent => agent.id))
  return [...BUILTIN_AGENTS.filter(agent => !ids.has(agent.id)), ...custom]
}

export async function reviewAgent(book: BookContext, id: string): Promise<ReviewAgent> {
  const agent = (await listReviewAgents(book)).find(candidate => candidate.id === id)
  if (!agent) throw new NotFoundError(`Review agent ${id}`)
  return agent
}

/** Writes a custom agent to `agents/<id>.md` (validated first). */
export async function saveCustomAgent(book: BookContext, input: unknown): Promise<ReviewAgent> {
  const agent = ReviewAgentSchema.parse({ ...(input as object), source: 'book' })
  await book.repository.writeRaw(pathOf(agent.id), serializeAgentFile(agent))
  return agent
}

export async function deleteCustomAgent(book: BookContext, id: string): Promise<void> {
  const { agents } = await readCustomAgents(book)
  if (!agents.some(agent => agent.id === id) && !(await book.repository.readRaw(pathOf(id)))) throw new NotFoundError(`Custom agent ${id}`)
  await book.repository.writeRaw(pathOf(id), null)
}
