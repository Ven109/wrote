import type { StructureNode } from '#shared/schemas/manuscript'

export interface Option {
  label: string
  value: string
}

/** Every scene, labelled with its chapter, in reading order (for linking beats). */
export function sceneOptions(parts: StructureNode[]): Option[] {
  return parts.flatMap(part => part.children.flatMap(chapter => chapter.children.map(scene => ({ label: `${chapter.title} › ${scene.title}`, value: scene.id }))))
}

/** Every chapter, labelled with its part (where a new scene can go). */
export function chapterOptions(parts: StructureNode[]): Option[] {
  return parts.flatMap(part => part.children.map(chapter => ({ label: `${part.title} › ${chapter.title}`, value: chapter.id })))
}

/** The chapter to suggest for a new scene: the one holding the last linked scene, else the last chapter. */
export function suggestedChapter(parts: StructureNode[], linkedScenes: string[]): string | undefined {
  const chapters = parts.flatMap(part => part.children)
  const last = linkedScenes.at(-1)
  return (last ? chapters.find(chapter => chapter.children.some(scene => scene.id === last)) : undefined)?.id ?? chapters.at(-1)?.id
}
