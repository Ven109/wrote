import { CreateSnapshotSchema } from '#shared/schemas/snapshot'
import { createSnapshot } from '../../../../services/snapshots'

/** Takes a named snapshot of the whole book or of one chapter/scene (`entryId`). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, CreateSnapshotSchema.parse)
  const book = await requireBook(event)
  const { files, ...snapshot } = await withStorageErrors(() => createSnapshot(book, input))
  setResponseStatus(event, 201)
  return { ...snapshot, fileCount: files.length }
})
