import type { IntegrationForm } from '~/composables/useIntegrations'

/** Suggested integrations: a head start for the form (the author still reviews the command and adds keys). */
export const INTEGRATION_PRESETS: { label: string, description: string, form: Partial<IntegrationForm> }[] = [
  {
    label: 'Web search (Brave)',
    description: 'Search the web from the assistant. Needs a free Brave Search API key.',
    form: { id: 'web-search', name: 'Web search', transport: 'stdio', command: 'npx', argsText: '-y\n@modelcontextprotocol/server-brave-search', secrets: [{ key: 'BRAVE_API_KEY', value: '' }], policy: 'allow' },
  },
  {
    label: 'Remote server (URL)',
    description: 'Any Streamable HTTP MCP server; sign in when it asks.',
    form: { transport: 'http', url: 'https://' },
  },
  {
    label: 'Local command',
    description: 'A server you start with a command, e.g. a reference manager.',
    form: { transport: 'stdio', command: '' },
  },
]
