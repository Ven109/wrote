/** Human-readable message from a `$fetch`/H3 error or any thrown value. */
export function apiErrorMessage(error: unknown): string {
  const data = (error as { data?: { statusMessage?: string, message?: string } } | null)?.data
  return data?.statusMessage ?? data?.message ?? (error instanceof Error ? error.message : 'Something went wrong')
}
