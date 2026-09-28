import type { GoalProgress, WritingSession } from '#shared/schemas/writing'
import { addDays, dailyTarget, localDay, streaks, writingDays } from '#shared/utils/goals'
import { createRecordId } from '#shared/utils/ids'
import { writingDelta } from '#shared/utils/writing-delta'
import type { IndexedChange } from '../db/indexer'
import { lastSession, saveSession, sessionsSince } from '../db/state/writing'
import { getProgress } from './progress'
import type { BookContext } from './workspace'

/** Edits less than this apart belong to one session. */
export const SESSION_GAP_MS = 30 * 60_000
/** Text cut this recently and pasted into another scene counts as moved, not written. */
const MOVE_WINDOW_MS = 10 * 60_000

/** Recently removed blocks per book (normalized text → time), for cross-scene moves. In memory on purpose. */
const removedBlocks = new Map<string, Map<string, number>>()

function recentRemovals(bookId: string, now: number): Map<string, number> {
  const recent = removedBlocks.get(bookId) ?? new Map<string, number>()
  for (const [text, at] of recent) if (now - at > MOVE_WINDOW_MS) recent.delete(text)
  removedBlocks.set(bookId, recent)
  return recent
}

/**
 * Records a scene edit in the current writing session (a new session after 30 minutes without edits or on a
 * new day): words added, deleted (moves excluded) and net. Other entry types are not writing.
 */
export async function recordWriting(book: BookContext, change: IndexedChange, now = new Date()): Promise<WritingSession | null> {
  if (change.type !== 'scene' || change.before === change.after) return null
  const recent = recentRemovals(book.id, now.getTime())
  const delta = writingDelta(change.before ?? '', change.after ?? '', new Set(recent.keys()))
  for (const text of delta.removedBlocks) recent.set(text, now.getTime())
  if (!delta.added && !delta.deleted && !delta.net) return null
  const day = localDay(now)
  const last = await lastSession(book.state)
  const continues = last && last.day === day && now.getTime() - Date.parse(last.endedAt) <= SESSION_GAP_MS
  const base: WritingSession = continues ? last : { id: createRecordId('ses', 10), day, startedAt: now.toISOString(), endedAt: now.toISOString(), added: 0, deleted: 0, net: 0 }
  const session = { ...base, endedAt: now.toISOString(), added: base.added + delta.added, deleted: base.deleted + delta.deleted, net: base.net + delta.net }
  await saveSession(book.state, session)
  return session
}

/** Goals, today, streaks and a year of history – what the Goals page, the header indicator and `get_progress` show. */
export async function goalProgress(book: BookContext, now = new Date()): Promise<GoalProgress> {
  const today = localDay(now)
  const [config, progress, sessions] = await Promise.all([book.repository.readConfig(), getProgress(book.db), sessionsSince(book.state, addDays(today, -365))])
  const days = writingDays(sessions)
  const todayStats = days.find(day => day.day === today) ?? { day: today, added: 0, deleted: 0, net: 0, minutes: 0 }
  const { target, deadline } = config.goals
  let words = progress.totalWords
  const history = [...days].reverse().map((day) => {
    const point = { day: day.day, words }
    words -= day.net
    return point
  }).reverse()
  return {
    totalWords: progress.totalWords,
    target,
    deadline,
    remaining: target === null ? null : Math.max(0, target - progress.totalWords),
    ...dailyTarget({ target, deadline, wordsAtStartOfToday: progress.totalWords - todayStats.net, today }),
    today: todayStats,
    streak: streaks(days, today),
    days,
    history,
    sessions: sessions.slice(-20).reverse(),
  }
}
