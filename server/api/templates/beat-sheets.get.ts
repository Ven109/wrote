import { listBeatSheets } from '../../services/beat-sheets'

/** Beat-sheet templates of the workspace (built-in ones are copied there on first use) and their folder. */
export default defineEventHandler(event => listBeatSheets(useWorkspaceDir(event)))
