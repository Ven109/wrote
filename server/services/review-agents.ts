import type { ReviewAgent } from '#shared/schemas/review'
import { BUILTIN_AGENTS } from '../review/builtin-agents'
import { NotFoundError } from '../storage/errors'
import type { BookContext } from './workspace'

/** Review agents available for a book (built-in ones for now; custom agents from `agents/` come later). */
export async function listReviewAgents(_book: BookContext): Promise<ReviewAgent[]> {
  return BUILTIN_AGENTS
}

export async function reviewAgent(book: BookContext, id: string): Promise<ReviewAgent> {
  const agent = (await listReviewAgents(book)).find(candidate => candidate.id === id)
  if (!agent) throw new NotFoundError(`Review agent ${id}`)
  return agent
}
