import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { TimelineItem, TimelineView } from '#shared/schemas/timeline'
import { findGaps, findOverlaps } from '#shared/utils/timeline-checks'
import { bookKeys } from '~/queries/keys'
import { timelineQuery } from '~/queries/timeline'
import { DEFAULT_ZOOM, moveItem, timelineLanes, timelineRange, timelineTicks, ZOOM_LEVELS, type LaneMode } from '~/utils/timeline-layout'

const EMPTY: TimelineView = { items: [], undated: [], people: [], locations: [], axis: null, config: { calendars: [] } }

/**
 * The book's timeline: scenes and events in in-world order as swimlanes on a proportional axis, filtered by
 * character/place, with overlaps (someone in two places at once) and long gaps flagged. Moving an item
 * rewrites its date in the file (optimistic; rolls back on error).
 */
export function useTimeline(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const key = () => bookKeys.timeline(toValue(bookId))
  const { data, isPending, error } = useQuery(() => timelineQuery(toValue(bookId)))
  const view = computed(() => data.value ?? EMPTY)

  const character = ref<string | null>(null)
  const place = ref<string | null>(null)
  const laneMode = ref<LaneMode>('chapter')
  const zoom = ref(DEFAULT_ZOOM)
  const perDay = computed(() => ZOOM_LEVELS[zoom.value]!)

  const items = computed(() => view.value.items.filter(item =>
    (!character.value || item.characters.includes(character.value)) && (!place.value || item.places.includes(place.value))))
  const lanes = computed(() => timelineLanes({ ...view.value, items: items.value }, laneMode.value))
  const range = computed(() => timelineRange(items.value))
  const ticks = computed(() => timelineTicks(range.value, perDay.value))
  const width = computed(() => (range.value.end - range.value.start) * perDay.value)
  const overlaps = computed(() => findOverlaps(view.value.items))
  const gaps = computed(() => findGaps(view.value.items))
  const flagged = computed(() => new Set([...overlaps.value.flatMap(o => o.items), ...gaps.value.flatMap(g => [g.after, g.before])]))
  const titleOf = (id: string) => view.value.items.find(item => item.id === id)?.title
    ?? [...view.value.people, ...view.value.locations].find(entry => entry.id === id)?.title ?? id

  const { mutate: move } = useMutation({
    mutation: ({ item, to }: { item: TimelineItem, to: number }) =>
      $fetch<{ date: string }>(`/api/books/${encodeURIComponent(toValue(bookId))}/timeline/${item.id}`, { method: 'PATCH', body: { key: to } }),
    onMutate: ({ item, to }) => {
      const previous = queryCache.getQueryData<TimelineView>(key())
      if (previous) queryCache.setQueryData(key(), moveItem(previous, item.id, to))
      return { previous }
    },
    onSuccess: ({ date }, { item }) => toast.add({ title: `${item.title} moved to ${date}`, color: 'success' }),
    onError: (err, _vars, context) => {
      if (context?.previous) queryCache.setQueryData(key(), context.previous)
      toast.add({ title: 'Could not move it', description: apiErrorMessage(err), color: 'error' })
    },
    onSettled: () => void queryCache.invalidateQueries({ key: key() }),
  })

  return {
    view,
    isPending,
    error,
    character,
    place,
    laneMode,
    zoom,
    perDay,
    canZoomIn: computed(() => zoom.value < ZOOM_LEVELS.length - 1),
    canZoomOut: computed(() => zoom.value > 0),
    zoomIn: () => (zoom.value = Math.min(ZOOM_LEVELS.length - 1, zoom.value + 1)),
    zoomOut: () => (zoom.value = Math.max(0, zoom.value - 1)),
    items,
    lanes,
    range,
    ticks,
    width,
    overlaps,
    gaps,
    flagged,
    titleOf,
    move: (item: TimelineItem, to: number) => to !== item.key && move({ item, to }),
  }
}
