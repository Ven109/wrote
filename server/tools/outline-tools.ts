import { z } from 'zod'
import { OutlineOpSchema } from '#shared/schemas/outline'
import { NewOutlineProposalSchema } from '#shared/schemas/outline-proposals'
import { readOutline, updateOutline } from '../services/outline'
import { createOutlineProposals } from '../services/outline-proposals'
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

export const proposeOutlineChangesTool = defineWroteTool({
  name: 'propose_outline_changes',
  title: 'Propose outline changes',
  description: 'Proposes changes to the plot outline for the author to accept or reject – new beats (addBeat: actId, afterBeatId or null for the start of the act, title, summary), edits of a beat (updateBeat: beatId, title and/or summary) and notes such as plot holes or open questions (note: text). Each can carry a short rationale. Nothing changes in the outline until the author accepts; prefer this over update_outline for ideas. Get ids from get_outline first.',
  permission: 'propose',
  input: z.object({
    proposals: z.array(NewOutlineProposalSchema).min(1).max(20),
    source: z.string().trim().max(200).optional().describe('What these proposals are, e.g. "Bridge from beat 4 to 5" (shown to the author)'),
  }),
  async handler({ proposals, source }, { book, caller }) {
    try {
      const created = await createOutlineProposals(book!, proposals, { author: caller, source })
      return { proposals: created.map(({ id, change, rationale }) => ({ id, change, rationale })), note: 'The proposals appear on the outline board for the author to accept or reject. Nothing was changed yet.' }
    }
    catch (error) {
      if (error instanceof InvalidInputError) throw new ToolError(error.message, 'invalid_input')
      throw error
    }
  },
})
