import { Socket } from 'node:net'
import { BASIC_AUTH_CHALLENGE, basicAuthConfig, isAuthorized } from '../services/basic-auth'

const config = basicAuthConfig(process.env)

/**
 * Optional HTTP basic auth for self-hosting (`WROTE_AUTH_USER` + `WROTE_AUTH_PASSWORD`), covering app, API and MCP.
 * In-process requests (server-side rendering calling the API through Nitro's local fetch) have no network socket
 * and pass: they only happen while serving a page request that was already authenticated here.
 */
export default defineEventHandler((event) => {
  if (!config || !(event.node.req.socket instanceof Socket)) return
  if (isAuthorized({ path: event.path, authorization: getHeader(event, 'authorization') }, config)) return
  setResponseHeader(event, 'WWW-Authenticate', BASIC_AUTH_CHALLENGE)
  throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
})
