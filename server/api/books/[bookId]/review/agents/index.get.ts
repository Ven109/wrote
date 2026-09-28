import { listReviewAgents } from '../../../../../services/review-agents'

/** Review agents available for the book. */
export default defineEventHandler(async event => listReviewAgents(await requireBook(event)))
