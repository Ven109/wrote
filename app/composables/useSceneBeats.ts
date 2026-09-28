import { useQuery } from '@pinia/colada'
import type { EntryDocument } from '#shared/schemas/document'
import { sceneBeatsQuery } from '~/queries/outline'

/** The outline beats the open scene tells, shown above the text while drafting. */
export function useSceneBeats(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const sceneId = () => (document.value?.type === 'scene' ? document.value.id : '')
  const { data } = useQuery(() => sceneBeatsQuery({ bookId: toValue(bookId), sceneId: sceneId() }))
  return {
    beats: computed(() => (sceneId() ? data.value ?? [] : [])),
    outlineHref: computed(() => `/books/${toValue(bookId)}/outline`),
  }
}
