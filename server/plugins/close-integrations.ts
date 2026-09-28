import { disconnectAll } from '../integrations/manager'

/** Stops local MCP servers (stdio) and closes remote connections when the app shuts down. */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('close', disconnectAll)
})
