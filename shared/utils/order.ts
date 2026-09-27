const ORDERED_NAME = /^(\d{2,})-(.+)$/

export interface OrderedName {
  order: number | null
  slug: string
}

/** Splits `03-the-map` (file or folder name without extension) into order + slug. */
export function parseOrderedName(name: string): OrderedName {
  const match = ORDERED_NAME.exec(name)
  if (!match) return { order: null, slug: name }
  return { order: Number(match[1]), slug: match[2]! }
}

/** Formats order + slug as `03-the-map`, zero-padded to at least two digits. */
export function formatOrderedName(order: number, slug: string, width = 2): string {
  return `${String(order).padStart(width, '0')}-${slug}`
}
