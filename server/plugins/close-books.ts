import { closeAllBooks } from '../services/workspace'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('close', closeAllBooks)
})
