import type { PiniaColadaOptions } from '@pinia/colada'

/** Global Pinia Colada defaults. Live SSE events invalidate book queries, so data rarely goes stale. */
export default {
  queryOptions: {
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  },
} satisfies PiniaColadaOptions
