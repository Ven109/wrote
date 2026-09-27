import { useQuery } from '@pinia/colada'
import { useClipboard } from '@vueuse/core'
import { mcpSettingsQuery } from '~/queries/settings'
import { mcpClientConfigs } from '~/utils/mcp-configs'

/** MCP connection details (endpoint, token) and copy-paste client configs. The token stays hidden until revealed. */
export function useMcpSettings() {
  const { data, status } = useQuery(mcpSettingsQuery)
  const revealed = ref(false)
  const { copy, copied } = useClipboard({ legacy: true })
  const configs = computed(() => (data.value ? mcpClientConfigs(data.value.url, data.value.token) : []))
  const maskedToken = computed(() => {
    const token = data.value?.token ?? ''
    return revealed.value ? token : token.replace(/(?<=^wrote_.{4}).+/, '•'.repeat(12))
  })
  return { data, status, configs, revealed, maskedToken, copy, copied }
}
