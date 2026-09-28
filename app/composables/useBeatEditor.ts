import { useQuery, useQueryCache } from '@pinia/colada'
import type { Beat, OutlineDocument, OutlineOp } from '#shared/schemas/outline'
import { bookKeys } from '~/queries/keys'
import { structureQuery } from '~/queries/manuscript'
import { chapterOptions, sceneOptions, suggestedChapter } from '~/utils/outline-scenes'

export interface BeatDraft {
  beat: Beat
  title: string
  summary: string
  scenes: string[]
  /** Chapter for "Create scene". */
  chapterId: string | undefined
}

/** The beat sheet: edit title and summary, link scenes, and create a scene from the beat. */
export function useBeatEditor(bookId: MaybeRefOrGetter<string>, apply: (...ops: OutlineOp[]) => Promise<unknown>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { data: structure } = useQuery(() => structureQuery(toValue(bookId)))
  const editing = ref<BeatDraft | null>(null)
  const creating = ref(false)
  /** Link to the scene just created from the beat (shown in the sheet). */
  const created = ref<{ title: string, href: string } | null>(null)
  const scenes = computed(() => sceneOptions(structure.value ?? []))
  const chapters = computed(() => chapterOptions(structure.value ?? []))

  function edit(beat: Beat) {
    editing.value = { beat, title: beat.title, summary: beat.summary, scenes: [...beat.scenes], chapterId: suggestedChapter(structure.value ?? [], beat.scenes) }
    created.value = null
  }

  async function save() {
    const current = editing.value
    if (!current?.title.trim()) return
    editing.value = null
    await apply({ op: 'updateBeat', beatId: current.beat.id, title: current.title.trim(), summary: current.summary, scenes: current.scenes })
  }

  /** Creates a scene from the beat (saved title/summary) in the chosen chapter and links it. */
  async function createScene() {
    const current = editing.value
    if (!current?.chapterId) return
    creating.value = true
    try {
      const result = await $fetch<{ sceneId: string, path: string, outline: OutlineDocument }>(
        `/api/books/${encodeURIComponent(toValue(bookId))}/outline/beats/${current.beat.id}/scene`,
        { method: 'POST', body: { chapterId: current.chapterId } },
      )
      queryCache.setQueryData(bookKeys.outline(toValue(bookId)), result.outline)
      void queryCache.invalidateQueries({ key: bookKeys.structure(toValue(bookId)) })
      current.scenes = [...current.scenes, result.sceneId]
      created.value = { title: current.beat.title, href: `/books/${toValue(bookId)}/write/${result.path}` }
    }
    catch (error) {
      toast.add({ title: 'Could not create the scene', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      creating.value = false
    }
  }

  return { editing, creating, created, scenes, chapters, edit, save, createScene }
}
