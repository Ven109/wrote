import type { H3Event } from 'h3'
import { openBook, resolveWorkspaceDir } from '../services/workspace'
import { StorageError } from '../storage/errors'

const STATUS_BY_CODE: Record<string, number> = {
  not_found: 404,
  conflict: 409,
  invalid_path: 400,
  invalid_input: 400,
  invalid_entry: 422,
}

export function useWorkspaceDir(event?: H3Event): string {
  return resolveWorkspaceDir(useRuntimeConfig(event).workspaceDir)
}

/** Resolves the `bookId` route param to an open book, mapping storage errors to HTTP errors. */
export async function requireBook(event: H3Event) {
  const bookId = getRouterParam(event, 'bookId') ?? ''
  return withStorageErrors(() => openBook(useWorkspaceDir(event), bookId))
}

/** Runs a storage/service call and converts typed domain errors into HTTP errors. */
export async function withStorageErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  }
  catch (error) {
    if (error instanceof StorageError) {
      throw createError({ statusCode: STATUS_BY_CODE[error.code] ?? 500, statusMessage: error.message, data: { code: error.code } })
    }
    throw error
  }
}
