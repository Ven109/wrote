import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { useClipboard } from '@vueuse/core'
import type { McpClientView, ToolPolicyPatch } from '#shared/schemas/permissions'
import { settingsKeys } from '~/queries/keys'
import { mcpSettingsQuery } from '~/queries/settings'
import { mcpClientConfigs } from '~/utils/mcp-configs'

/**
 * "Connect agents" settings: MCP clients (each with its own token and policy) and the assistant's policy.
 * A new client's token is shown once, with ready-to-paste configs; afterwards only its preview is known.
 */
export function useMcpSettings() {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { data, status } = useQuery(mcpSettingsQuery)
  const { copy, copied } = useClipboard({ legacy: true })
  const created = shallowRef<{ client: McpClientView, token: string } | null>(null)
  const newName = ref('')
  const refresh = () => queryCache.invalidateQueries({ key: settingsKeys.mcp() })
  const onError = (title: string) => (error: unknown) => toast.add({ title, description: apiErrorMessage(error), color: 'error' })

  const create = useMutation({
    mutation: (name: string) => $fetch<{ client: McpClientView, token: string }>('/api/settings/mcp/clients', { method: 'POST', body: { name } }),
    onSuccess: (result) => {
      created.value = result
      newName.value = ''
    },
    onError: onError('Could not create the client'),
    onSettled: refresh,
  })
  const updateClient = useMutation({
    mutation: ({ id, policy }: { id: string, policy: ToolPolicyPatch }) => $fetch(`/api/settings/mcp/clients/${id}`, { method: 'PATCH', body: { policy } }),
    onError: onError('Could not change the policy'),
    onSettled: refresh,
  })
  const revoke = useMutation({
    mutation: (id: string) => $fetch(`/api/settings/mcp/clients/${id}`, { method: 'DELETE' }),
    onSuccess: () => toast.add({ title: 'Client revoked', description: 'Its token no longer works.', color: 'success' }),
    onError: onError('Could not revoke the client'),
    onSettled: refresh,
  })
  const updateAssistant = useMutation({
    mutation: (policy: ToolPolicyPatch) => $fetch('/api/settings/mcp/assistant', { method: 'PATCH', body: { policy } }),
    onError: onError('Could not change the assistant\'s policy'),
    onSettled: refresh,
  })

  return {
    data,
    status,
    newName,
    created,
    /** Copy-paste configs for the token just created. */
    configs: computed(() => (data.value && created.value ? mcpClientConfigs(data.value.url, created.value.token) : [])),
    copy,
    copied,
    creating: create.isLoading,
    createClient: () => (newName.value.trim() ? create.mutateAsync(newName.value.trim()).catch(() => null) : null),
    dismissToken: () => (created.value = null),
    setPolicy: (id: string, policy: ToolPolicyPatch) => updateClient.mutateAsync({ id, policy }).catch(() => null),
    revoke: (id: string) => revoke.mutateAsync(id).catch(() => null),
    setAssistantPolicy: (policy: ToolPolicyPatch) => updateAssistant.mutateAsync(policy).catch(() => null),
  }
}
