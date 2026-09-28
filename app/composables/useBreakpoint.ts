import { breakpointsTailwind, useBreakpoints, useMediaQuery } from '@vueuse/core'

/** Responsive helpers shared by layout and editor. `isDesktop` matches Tailwind's `lg`. */
export function useBreakpoint() {
  const breakpoints = useBreakpoints(breakpointsTailwind, { ssrWidth: 1280 })
  const isDesktop = breakpoints.greaterOrEqual('lg')
  const isMobile = breakpoints.smaller('lg')
  /** Room for a margin column next to the editor (comments). */
  const isWide = breakpoints.greaterOrEqual('xl')
  const isCoarsePointer = useMediaQuery('(pointer: coarse)', { ssrWidth: 1280 })

  return { isDesktop, isMobile, isWide, isCoarsePointer }
}
