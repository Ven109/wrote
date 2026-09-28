import { stringify } from 'yaml'
import { ReviewAgentSchema, type ReviewAgent } from '#shared/schemas/review'
import { parseMarkdownFile } from '#shared/utils/frontmatter'

/** A custom agent file that could not be read, with why. */
export interface AgentFileProblem {
  file: string
  message: string
}

const zodMessage = (error: unknown) => {
  const issues = (error as { issues?: { path: PropertyKey[], message: string }[] }).issues
  return issues?.length ? issues.map(issue => `${issue.path.join('.') || 'file'}: ${issue.message}`).join('; ') : error instanceof Error ? error.message : String(error)
}

/**
 * Parses `agents/<id>.md`: settings in the frontmatter (`name`, `description`, `scopes`, `model` = chat or
 * fast, `tools`, `categories`, `summary`), the instructions in the body. The file name is the agent's id.
 */
export function parseAgentFile(fileName: string, source: string): { agent: ReviewAgent } | { problem: AgentFileProblem } {
  const id = fileName.replace(/\.md$/, '')
  try {
    const { data, body } = parseMarkdownFile(source)
    const agent = ReviewAgentSchema.parse({ ...data, task: data.model ?? data.task, id, instructions: body.trim(), source: 'book' })
    return { agent }
  }
  catch (error) {
    return { problem: { file: `agents/${fileName}`, message: zodMessage(error) } }
  }
}

/** The file text for a custom agent (round-trips through `parseAgentFile`). */
export function serializeAgentFile(agent: ReviewAgent): string {
  const settings = { name: agent.name, description: agent.description || undefined, scopes: agent.scopes, model: agent.task, tools: agent.tools.length ? agent.tools : undefined, categories: agent.categories.length ? agent.categories : undefined, summary: agent.summary || undefined }
  const defined = Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined))
  return `---\n${stringify(defined, { lineWidth: 0 }).trimEnd()}\n---\n${agent.instructions.trim()}\n`
}
