import { aiSettingsView, loadAiConfig } from '../../../services/ai-settings'

/** AI settings for the settings page. API keys are never included – only whether one is set. */
export default defineEventHandler(async (event) => {
  return aiSettingsView(await loadAiConfig(useWorkspaceDir(event)))
})
