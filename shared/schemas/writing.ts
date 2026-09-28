/** One writing session: edits with less than 30 minutes between them. */
export interface WritingSession {
  id: string
  day: string
  startedAt: string
  endedAt: string
  added: number
  deleted: number
  net: number
}

export interface WritingDay {
  day: string
  added: number
  deleted: number
  net: number
  minutes: number
}

/** Goals, today's progress, streaks and history – the Goals page, the header indicator and `get_progress`. */
export interface GoalProgress {
  totalWords: number
  target: number | null
  deadline: string | null
  remaining: number | null
  /** Days left including today (null without a deadline; 0 when it passed). */
  daysLeft: number | null
  /** Words per day needed from the start of today to reach the target by the deadline. */
  dailyTarget: number | null
  today: WritingDay
  streak: { current: number, longest: number }
  /** Days with writing, oldest first (last year). */
  days: WritingDay[]
  /** Total words at the end of each day with writing (for the words-over-time chart). */
  history: { day: string, words: number }[]
  sessions: WritingSession[]
}
