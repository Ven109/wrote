import type { SceneMeta } from '#shared/schemas/document'
import type { SceneStatus } from '#shared/schemas/entry'

/** Form state of the scene metadata panel (strings are never null in inputs). */
export interface SceneMetaForm {
  status: SceneStatus
  pov: string
  location: string
  timeline: string
  synopsis: string
  tags: string[]
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

export function metaFormFrom(frontmatter: Record<string, unknown>): SceneMetaForm {
  return {
    status: (frontmatter.status as SceneStatus | undefined) ?? 'draft',
    pov: text(frontmatter.pov),
    location: text(frontmatter.location),
    timeline: text(frontmatter.timeline),
    synopsis: text(frontmatter.synopsis),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.filter((tag): tag is string => typeof tag === 'string') : [],
  }
}

/** Converts the form into an API patch: blank text clears the field. */
export function metaPatchFrom(form: SceneMetaForm): SceneMeta {
  const orNull = (value: string) => value.trim() || null
  return {
    status: form.status,
    pov: orNull(form.pov),
    location: orNull(form.location),
    timeline: orNull(form.timeline),
    synopsis: orNull(form.synopsis),
    tags: form.tags.map(tag => tag.trim()).filter(Boolean),
  }
}
