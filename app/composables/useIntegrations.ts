import { useQuery, useQueryCache } from '@pinia/colada'
import type { IntegrationPolicy, IntegrationView, SaveIntegrationInput } from '#shared/schemas/integrations'
import { slugify } from '#shared/utils/slug'
import { settingsKeys } from '~/queries/keys'
import { integrationsQuery } from '~/queries/settings'

/** The form's shape: arguments one per line, secrets as key/value rows (an empty value keeps the stored one). */
export interface IntegrationForm {
  id: string
  name: string
  transport: 'http' | 'stdio'
  url: string
  command: string
  argsText: string
  secrets: { key: string, value: string }[]
  policy: IntegrationPolicy
  enabled: boolean
}

const blank = (): IntegrationForm => ({ id: '', name: '', transport: 'stdio', url: '', command: '', argsText: '', secrets: [], policy: 'ask', enabled: true })

function toInput(form: IntegrationForm, existing: IntegrationView | null): SaveIntegrationInput {
  const secretMap = Object.fromEntries(form.secrets.filter(row => row.key.trim() && row.value).map(row => [row.key.trim(), row.value]))
  const kept = new Set(form.secrets.map(row => row.key.trim()))
  const removed = Object.fromEntries((existing?.secretsSet ?? []).filter(key => !kept.has(key)).map(key => [key, null]))
  const secrets = { ...removed, ...secretMap }
  return {
    id: form.id,
    name: form.name,
    transport: form.transport,
    url: form.transport === 'http' ? form.url.trim() : null,
    command: form.transport === 'stdio' ? form.command.trim() : null,
    args: form.transport === 'stdio' ? form.argsText.split('\n').map(arg => arg.trim()).filter(Boolean) : [],
    envKeys: [],
    headerKeys: [],
    enabled: form.enabled,
    policy: form.policy,
    disabledTools: existing?.disabledTools ?? [],
    env: form.transport === 'stdio' ? secrets : {},
    headers: form.transport === 'http' ? secrets : {},
  }
}

/**
 * Settings → Integrations: external MCP servers for the assistant (web search, reference managers, …):
 * add/edit/remove, status, sign-in for OAuth servers, per-tool toggles.
 */
export function useIntegrations() {
  const queryCache = useQueryCache()
  const toast = useToast()
  const route = useRoute()
  const { data, status } = useQuery(integrationsQuery)
  const form = ref<IntegrationForm | null>(null)
  const editing = ref<IntegrationView | null>(null)
  const busy = ref<string | null>(null)
  const refresh = () => queryCache.invalidateQueries({ key: settingsKeys.integrations() })
  const setView = (view: IntegrationView) => queryCache.setQueryData(settingsKeys.integrations(), (data.value ?? []).map(item => (item.id === view.id ? view : item)))

  if (import.meta.client) {
    if (typeof route.query.connected === 'string') toast.add({ title: 'Signed in', description: `${route.query.connected} is connected.`, color: 'success' })
    if (typeof route.query.error === 'string') toast.add({ title: 'Sign-in failed', description: route.query.error, color: 'error' })
  }

  watch(() => form.value?.name, (name) => {
    if (form.value && !editing.value && name !== undefined) form.value.id = slugify(name).slice(0, 40)
  })

  async function run<T>(id: string, action: () => Promise<T>, failure: string): Promise<T | undefined> {
    busy.value = id
    try {
      return await action()
    }
    catch (error) {
      toast.add({ title: failure, description: apiErrorMessage(error), color: 'error' })
      return undefined
    }
    finally {
      busy.value = null
    }
  }

  async function save() {
    const current = form.value
    if (!current) return
    const input = toInput(current, editing.value)
    const saved = await run('form', () => editing.value
      ? $fetch<IntegrationView>(`/api/settings/integrations/${current.id}`, { method: 'PUT', body: input })
      : $fetch<IntegrationView>('/api/settings/integrations', { method: 'POST', body: input }), 'Could not save the integration')
    if (!saved) return
    form.value = null
    editing.value = null
    await refresh()
    toast.add(saved.state === 'connected'
      ? { title: `${saved.name} is connected`, description: `${saved.tools.length} tools available to the assistant.`, color: 'success' }
      : { title: `${saved.name} saved`, description: saved.error ?? 'Not connected yet.', color: saved.state === 'error' ? 'warning' : 'neutral' })
  }

  return {
    integrations: computed(() => data.value ?? []),
    loading: computed(() => status.value === 'pending'),
    form,
    editing,
    busy,
    open: computed({ get: () => form.value !== null, set: (open: boolean) => !open && (form.value = null) }),
    create: (preset: Partial<IntegrationForm> = {}) => {
      editing.value = null
      form.value = { ...blank(), ...structuredClone(preset) }
    },
    edit: (integration: IntegrationView) => {
      editing.value = integration
      form.value = {
        id: integration.id,
        name: integration.name,
        transport: integration.transport,
        url: integration.url ?? '',
        command: integration.command ?? '',
        argsText: integration.args.join('\n'),
        secrets: integration.secretsSet.map(key => ({ key, value: '' })),
        policy: integration.policy,
        enabled: integration.enabled,
      }
    },
    save,
    remove: async (integration: IntegrationView) => {
      await run(integration.id, () => $fetch(`/api/settings/integrations/${integration.id}`, { method: 'DELETE' }), 'Could not remove the integration')
      await refresh()
    },
    reconnect: async (integration: IntegrationView) => {
      const view = await run(integration.id, () => $fetch<IntegrationView>(`/api/settings/integrations/${integration.id}/connect`, { method: 'POST' }), 'Could not connect')
      if (view) setView(view)
    },
    toggleTool: async (integration: IntegrationView, tool: string, enabled: boolean) => {
      const view = await run(integration.id, () => $fetch<IntegrationView>(`/api/settings/integrations/${integration.id}/tools/${encodeURIComponent(tool)}`, { method: 'PATCH', body: { enabled } }), 'Could not change the tool')
      if (view) setView(view)
    },
  }
}
