/** Liveness probe for Docker, `wrote` and uptime checks. Public even with basic auth on; reveals only the version. */
export default defineEventHandler(event => ({ status: 'ok' as const, version: useRuntimeConfig(event).appVersion }))
