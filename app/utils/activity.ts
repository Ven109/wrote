import type { ActivityEntry, ActivityFilter, FileChange } from '#shared/schemas/activity'

export type ActivityActorFilter = 'all' | 'assistant' | 'mcp' | 'user'
export type ActivityRange = 'all' | 'day' | 'week' | 'month'

export interface ActivityFilterForm {
  actor: ActivityActorFilter
  tool: string
  range: ActivityRange
}

export const ACTOR_OPTIONS: { label: string, value: ActivityActorFilter }[] = [
  { label: 'Everyone', value: 'all' },
  { label: 'Assistant', value: 'assistant' },
  { label: 'MCP agents', value: 'mcp' },
  { label: 'You (undos)', value: 'user' },
]

export const RANGE_OPTIONS: { label: string, value: ActivityRange }[] = [
  { label: 'Any time', value: 'all' },
  { label: 'Last 24 hours', value: 'day' },
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 30 days', value: 'month' },
]

const RANGE_MS: Record<Exclude<ActivityRange, 'all'>, number> = { day: 864e5, week: 7 * 864e5, month: 30 * 864e5 }

/** The API filter for the panel's controls (`all` = no filter). */
export function activityQueryFilter(form: ActivityFilterForm, now = new Date()): Partial<ActivityFilter> {
  return {
    ...(form.actor !== 'all' ? { actor: form.actor } : {}),
    ...(form.tool !== 'all' ? { tool: form.tool } : {}),
    ...(form.range !== 'all' ? { since: new Date(now.getTime() - RANGE_MS[form.range]).toISOString() } : {}),
  }
}

const verb = (change: FileChange) => (change.before === null ? 'created' : change.after === null ? 'removed' : 'changed')

/** One line per changed file: "created notes/inbox/idea.md". */
export const changeLabel = (change: FileChange) => `${verb(change)} ${change.path}`

export const actorIcon = (entry: ActivityEntry) =>
  entry.actor.kind === 'mcp' ? 'i-lucide-plug' : entry.actor.kind === 'user' ? 'i-lucide-user' : 'i-lucide-sparkles'

/** Tool names seen so far, for the tool filter (kept across filtering so options don't disappear). */
export function mergeToolNames(known: string[], entries: ActivityEntry[]): string[] {
  return [...new Set([...known, ...entries.map(entry => entry.tool)])].sort()
}
