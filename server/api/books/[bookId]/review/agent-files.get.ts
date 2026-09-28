import { readCustomAgents } from '../../../../services/review-agents'

/** The book's custom agents (`agents/*.md`) and the files that are not valid agents, with why. */
export default defineEventHandler(async event => readCustomAgents(await requireBook(event)))
