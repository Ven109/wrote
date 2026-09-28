import { exportCapabilities } from '../../export/tools'

/** Which export tools are installed (Pandoc, Typst), which formats work and how to install what is missing. */
export default defineEventHandler(async (event) => {
  const { fresh } = getQuery(event)
  return exportCapabilities({ fresh: fresh === '1' })
})
