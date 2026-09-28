/**
 * Lighter icons app-wide: Lucide is drawn with a 1.5px stroke (instead of 2px) and Nuxt UI's component icons are
 * one size step smaller (size-5 → size-4, size-6 → size-5). Used by `app.config.ts`.
 */

export const ICON_STROKE_WIDTH = '1.5'

/** Thins Lucide's stroke; applied to every icon by Nuxt Icon. */
export function thinStroke(content: string): string {
  return content.replaceAll('stroke-width="2"', `stroke-width="${ICON_STROKE_WIDTH}"`)
}

/** Size variants for a component's icon slots: md/lg → size-4, xl → size-5. */
export function smallerIcons(...slots: string[]) {
  const sized = (size: string) => Object.fromEntries(slots.map(slot => [slot, size]))
  return { variants: { size: { md: sized('size-4'), lg: sized('size-4'), xl: sized('size-5') } } }
}
