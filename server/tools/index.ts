import type { WroteTool } from './define'
import { getCodexTool, getProgressTool, getStructureTool, listBooksTool, readEntryTool, searchTool } from './read-tools'
import { createNoteTool, listSuggestionsTool, proposeEditTool } from './write-tools'

/** All tools available to the assistant and MCP clients. */
export const WROTE_TOOLS = [
  listBooksTool,
  searchTool,
  readEntryTool,
  getStructureTool,
  getCodexTool,
  getProgressTool,
  listSuggestionsTool,
  createNoteTool,
  proposeEditTool,
] as const satisfies readonly WroteTool[]

export { runTool, defineWroteTool, ToolError } from './define'
export type { ToolContext, ToolPermission, WroteTool } from './define'
