/** A planted issue: a scene and the passage an agent should flag (`quote: null` = anywhere in the scene). */
export interface PlantedIssue {
  scene: string
  quote: string | null
  note?: string
}

export interface ScoredFinding {
  scene: string
  quote: string
  category: string
}

export interface ReviewScore {
  planted: number
  caught: number
  findings: number
  /** Findings that match a planted issue. */
  relevant: number
  recall: number
  precision: number
  missed: PlantedIssue[]
}

const squash = (text: string) => text.toLowerCase().replace(/[“”"'’‘.,;:!?]/g, '').replace(/\s+/g, ' ').trim()
const overlaps = (a: string, b: string) => squash(a).includes(squash(b)) || squash(b).includes(squash(a))
const matches = (issue: PlantedIssue, finding: ScoredFinding) => issue.scene === finding.scene && (issue.quote === null || overlaps(issue.quote, finding.quote))

/**
 * Recall (planted issues an agent flagged) and precision (findings that are planted issues – a lower bound,
 * since an agent may find real issues nobody planted).
 */
export function scoreReview(planted: PlantedIssue[], findings: ScoredFinding[]): ReviewScore {
  const missed = planted.filter(issue => !findings.some(finding => matches(issue, finding)))
  const relevant = findings.filter(finding => planted.some(issue => matches(issue, finding))).length
  return {
    planted: planted.length,
    caught: planted.length - missed.length,
    findings: findings.length,
    relevant,
    recall: planted.length ? (planted.length - missed.length) / planted.length : 1,
    precision: findings.length ? relevant / findings.length : 1,
    missed,
  }
}
