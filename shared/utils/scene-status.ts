import type { SceneStatus } from '../schemas/entry'

/** Display metadata for scene statuses (color names are Nuxt UI semantic colors). */
export const SCENE_STATUS_META: Record<SceneStatus, { label: string, color: 'neutral' | 'info' | 'warning' | 'success' }> = {
  idea: { label: 'Idea', color: 'neutral' },
  draft: { label: 'Draft', color: 'info' },
  revised: { label: 'Revised', color: 'warning' },
  final: { label: 'Final', color: 'success' },
}
