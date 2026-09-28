import type { WroteTool } from './define'
import { getCodexEntryTool, getCodexTool } from './codex-tools'
import { addCommentTool, listCommentsTool } from './comment-tools'
import { extractCodexTool, proposeCodexEntriesTool } from './extraction-tools'
import { getOutlineTool, proposeOutlineChangesTool, updateOutlineTool } from './outline-tools'
import { getProgressTool, getStructureTool, listBooksTool, readEntryTool, searchTool } from './read-tools'
import { getSummariesTool } from './summary-tools'
import { createNoteTool, listSuggestionsTool, proposeEditTool } from './write-tools'

/** All tools available to the assistant and MCP clients. */
export const WROTE_TOOLS = [
  listBooksTool,
  searchTool,
  readEntryTool,
  getStructureTool,
  getSummariesTool,
  getOutlineTool,
  getCodexTool,
  getCodexEntryTool,
  getProgressTool,
  listSuggestionsTool,
  createNoteTool,
  proposeEditTool,
  extractCodexTool,
  proposeCodexEntriesTool,
  listCommentsTool,
  addCommentTool,
  proposeOutlineChangesTool,
  updateOutlineTool,
] as const satisfies readonly WroteTool[]

export { runTool, defineWroteTool, ToolError } from './define'
export type { ToolContext, ToolPermission, WroteTool } from './define'
