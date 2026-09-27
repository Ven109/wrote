function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Prepares frontmatter for writing so files change minimally:
 * - keys keep the order they have on disk (`raw`), new keys are appended;
 * - schema defaults that were not in the file (e.g. `tags: []`) are not written;
 * - `undefined` values are dropped.
 */
export function mergeFrontmatterForWrite(
  raw: Record<string, unknown>,
  next: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const keep = (key: string) => {
    const value = next[key]
    if (value === undefined) return false
    return key in raw || !(key in defaults) || !isEqual(value, defaults[key])
  }
  const ordered = [...Object.keys(raw).filter(key => key in next), ...Object.keys(next).filter(key => !(key in raw))]
  return Object.fromEntries(ordered.filter(keep).map(key => [key, next[key]]))
}
