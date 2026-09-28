import { z } from 'zod'
import { OutlineOpSchema } from '#shared/schemas/outline'
import { readOutline, updateOutline } from '../services/outline'
import { InvalidInputError } from '../storage/errors'
import { defineWroteTool, ToolError } from './define'

export const getOutlineTool = defineWroteTool({
  name: 'get_outline',
  title: 'Get the outline',
  description: 'Returns the plot outline: the author\'s notes and the acts with their beats (id, title, summary, and the ids of the scenes that tell each beat – empty means not written yet).',
  permission: 'read',
  input: z.object({}),
  handler: async (_input, { book }) => (await readOutline(book!)).outline,
})

export const updateOutlineTool = defineWroteTool({
  name: 'update_outline',
  title: 'Update the outline',
  description: 'Restructures the plot outline with a list of operations applied in order: addAct, renameAct, deleteAct, moveAct, addBeat, updateBeat (title, summary, scenes), deleteBeat, moveBeat (to an act and index), setNotes. Get ids from get_outline first. Changes are logged and can be undone by the author.',
  permission: 'write',
  input: z.object({ ops: z.array(OutlineOpSchema).min(1).max(50) }),
  async handler({ ops }, { book }) {
    try {
      return (await updateOutline(book!, ops)).outline
    }
    catch (error) {
      if (error instanceof InvalidInputError) throw new ToolError(error.message, 'invalid_input')
      throw error
    }
  },
})
