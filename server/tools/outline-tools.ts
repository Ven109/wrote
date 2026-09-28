import { z } from 'zod'
import { ActIdSchema, BeatIdSchema, OutlineOpSchema } from '#shared/schemas/outline'
import { NewOutlineProposalSchema } from '#shared/schemas/outline-proposals'
import { getModelWithRef } from '../ai/models'
import { readOutline, updateOutline } from '../services/outline'
import { generateWith, reviewOutline, suggestBridgeBeats } from '../services/outline-helpers'
import { createOutlineProposals } from '../services/outline-proposals'
import { InvalidInputError, NotFoundError } from '../storage/errors'
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

const helperView = (proposals: { id: string, change: unknown, rationale: string }[]) => ({
  proposals: proposals.map(({ id, change, rationale }) => ({ id, change, rationale })),
  note: 'The proposals appear on the outline board for the author to accept or reject. Nothing was changed yet.',
})

/** Runs an outline helper with Wrote's configured model; errors become tool errors the agent can act on. */
async function withConfiguredModel<T>(workspaceDir: string, bookId: string, run: (options: { generate: ReturnType<typeof generateWith>, model: string }) => Promise<T>): Promise<T> {
  const configured = await getModelWithRef(workspaceDir, 'outline', { bookId })
  if (!configured) throw new ToolError('No AI model is configured in Wrote. Read the outline with get_outline and use propose_outline_changes instead.', 'ai_not_configured')
  try {
    return await run({ generate: generateWith(configured.model), model: configured.ref })
  }
  catch (error) {
    if (error instanceof InvalidInputError || error instanceof NotFoundError) throw new ToolError(error.message, 'invalid_input')
    throw error
  }
}

export const suggestBridgeBeatsTool = defineWroteTool({
  name: 'suggest_bridge_beats',
  title: 'Suggest bridge beats',
  description: 'Asks Wrote\'s configured AI model for 2–4 alternative beats that get the story from one beat to another, and proposes them on the outline (after the first beat) for the author to accept or reject. If you can think them up yourself, use propose_outline_changes instead.',
  permission: 'propose',
  input: z.object({ fromBeatId: BeatIdSchema, toBeatId: BeatIdSchema, count: z.number().int().min(2).max(4).optional() }),
  handler: (input, { book, caller, workspaceDir }) =>
    withConfiguredModel(workspaceDir, book!.id, async options => helperView(await suggestBridgeBeats(book!, input, { ...options, author: caller }))),
})

export const reviewOutlineTool = defineWroteTool({
  name: 'review_outline',
  title: 'Review the outline',
  description: 'Asks Wrote\'s configured AI model to find plot holes in the outline (or, with actId, what is missing in that act), optionally compared with a beat-sheet template (templateId, e.g. "save-the-cat"). Results are proposed as notes and beats for the author to accept or reject.',
  permission: 'propose',
  input: z.object({ actId: ActIdSchema.optional(), templateId: z.string().regex(/^[\w.-]+$/).optional() }),
  handler: (input, { book, caller, workspaceDir }) =>
    withConfiguredModel(workspaceDir, book!.id, async options => helperView(await reviewOutline(book!, input, { ...options, author: caller }))),
})
