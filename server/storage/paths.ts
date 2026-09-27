import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { InvalidPathError } from './errors'

/** Converts an OS path to a POSIX, book-relative path. */
export function toPosix(path: string): string {
  return path.split(sep).join('/')
}

/**
 * Resolves a book-relative POSIX path to an absolute path inside `root`.
 * Rejects absolute paths, `..` traversal, and anything resolving outside the book.
 */
export function resolveInBook(root: string, path: string): string {
  if (!path || isAbsolute(path) || path.includes('\0')) throw new InvalidPathError(path)
  const absolute = resolve(root, ...path.split('/'))
  const rel = relative(root, absolute)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new InvalidPathError(path)
  return absolute
}

export function relativeToBook(root: string, absolute: string): string {
  return toPosix(relative(root, absolute))
}

export function joinPosix(...parts: string[]): string {
  return toPosix(join(...parts))
}
